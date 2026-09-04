import type { Request, Response } from "express";
import { buildInboundVoiceTwiml, logInboundCall } from "../services/twilio/voice.js";
import { executeToolCall } from "../services/vapi/tools.js";
import { AppError, ValidationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

function extractToolCall(body: Record<string, unknown>): {
  name: string;
  arguments: Record<string, unknown>;
  call?: { customer?: { number?: string; name?: string } };
} | null {
  // Vapi tool-calls message shape
  const message = (body.message ?? body) as Record<string, unknown>;
  const toolCallList =
    (message.toolCallList as Array<Record<string, unknown>> | undefined) ||
    (message.toolCalls as Array<Record<string, unknown>> | undefined) ||
    [];

  const first = toolCallList[0];
  if (first) {
    const fn = (first.function as Record<string, unknown> | undefined) ?? first;
    const rawArgs = fn.arguments ?? first.arguments ?? {};
    const args =
      typeof rawArgs === "string"
        ? (JSON.parse(rawArgs) as Record<string, unknown>)
        : (rawArgs as Record<string, unknown>);
    return {
      name: String(fn.name ?? first.name ?? ""),
      arguments: args,
      call: (message.call as { customer?: { number?: string; name?: string } }) ||
        (body.call as { customer?: { number?: string; name?: string } }),
    };
  }

  // Direct tool endpoint: { name, arguments }
  if (typeof body.name === "string") {
    return {
      name: body.name,
      arguments: (body.arguments as Record<string, unknown>) || {},
      call: body.call as { customer?: { number?: string; name?: string } } | undefined,
    };
  }

  return null;
}

/**
 * Twilio inbound voice webhook.
 * Configure the Twilio number Voice webhook to POST here.
 */
export async function handleTwilioVoiceWebhook(req: Request, res: Response): Promise<void> {
  const callSid = String(req.body.CallSid ?? "");
  const from = String(req.body.From ?? "");
  const to = String(req.body.To ?? "");

  logInboundCall({ callSid, from, to });

  const twiml = buildInboundVoiceTwiml();
  res.status(200).type("text/xml").send(twiml);
}

/**
 * Vapi server URL webhook — handles assistant-request, tool-calls, end-of-call, status updates.
 */
export async function handleVapiWebhook(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const message = (body.message ?? body) as Record<string, unknown>;
  const type = String(message.type ?? body.type ?? "");

  logger.info({ type }, "Vapi webhook received");

  switch (type) {
    case "tool-calls":
    case "function-call": {
      const toolCall = extractToolCall(body);
      if (!toolCall?.name) {
        throw new ValidationError("Missing tool call payload");
      }

      const result = await executeToolCall(toolCall);
      const toolCallId =
        ((message.toolCallList as Array<{ id?: string }> | undefined)?.[0]?.id) ||
        ((message.toolCalls as Array<{ id?: string }> | undefined)?.[0]?.id) ||
        "tool-call";

      // Vapi expects results keyed by toolCallId
      res.status(200).json({
        results: [
          {
            toolCallId,
            result: JSON.stringify(result),
          },
        ],
      });
      return;
    }

    case "assistant-request": {
      // Optionally customize assistant per caller; default assistant is configured in Vapi.
      res.status(200).json({});
      return;
    }

    case "status-update":
    case "end-of-call-report":
    case "hang":
    case "speech-update":
    case "transcript": {
      logger.debug({ type, message }, "Vapi event acknowledged");
      res.status(200).json({ ok: true });
      return;
    }

    default: {
      // Unknown / empty type — acknowledge to avoid retries
      logger.debug({ type, keys: Object.keys(body) }, "Unhandled Vapi webhook type");
      res.status(200).json({ ok: true });
    }
  }
}

/**
 * Explicit tool execution endpoint for Vapi custom tools pointing at discrete URLs.
 * POST /tools/:toolName  or  POST /tools with { name, arguments }
 */
export async function handleToolExecution(req: Request, res: Response): Promise<void> {
  const toolName = String(req.params.toolName || req.body?.name || "");
  if (!toolName) {
    throw new ValidationError("toolName is required");
  }

  const body = req.body as Record<string, unknown>;
  // Support both raw args and Vapi-wrapped tool-calls
  let args: Record<string, unknown> = {};
  let callerPhone: string | undefined;

  if (body.message || body.toolCallList || body.toolCalls) {
    const extracted = extractToolCall(body);
    if (!extracted) {
      throw new ValidationError("Unable to parse Vapi tool-call body");
    }
    args = extracted.arguments;
    callerPhone = extracted.call?.customer?.number;
  } else {
    args = (body.arguments as Record<string, unknown>) || body;
    callerPhone =
      (body.call as { customer?: { number?: string } } | undefined)?.customer?.number ||
      (req.header("x-caller-phone") ?? undefined);
  }

  try {
    const result = await executeToolCall({
      name: toolName,
      arguments: args,
      call: callerPhone ? { customer: { number: callerPhone } } : undefined,
    });

    // Discrete custom-tool URLs often expect the result object directly
    if (body.message || body.toolCallList || body.toolCalls) {
      const message = (body.message ?? body) as Record<string, unknown>;
      const toolCallId =
        ((message.toolCallList as Array<{ id?: string }> | undefined)?.[0]?.id) ||
        ((message.toolCalls as Array<{ id?: string }> | undefined)?.[0]?.id) ||
        "tool-call";
      res.status(200).json({
        results: [{ toolCallId, result: JSON.stringify(result) }],
      });
      return;
    }

    res.status(200).json(result);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw err;
  }
}
