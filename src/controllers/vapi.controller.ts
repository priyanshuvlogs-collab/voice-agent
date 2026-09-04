import type { Request, Response } from "express";
import type { Logger } from "pino";
import type { Env } from "../config/env";
import type { CallSessionStore } from "../services/callSession.service";
import type { GhlService } from "../services/ghl.service";
import { executeToolCalls } from "../tools";
import type { VapiWebhookBody } from "../types/vapi";
import { maskPhone } from "../utils/phone";

export class VapiController {
  constructor(
    private readonly env: Env,
    private readonly ghl: GhlService,
    private readonly sessions: CallSessionStore,
    private readonly logger: Logger,
  ) {}

  async webhook(req: Request, res: Response): Promise<void> {
    const body = req.body as VapiWebhookBody;
    const message = body?.message;
    if (!message?.type) {
      res.status(400).json({ error: "Missing message.type" });
      return;
    }

    const callerNumber = message.call?.customer?.number ?? message.customer?.number;
    this.logger.info(
      { type: message.type, callId: message.call?.id, caller: maskPhone(callerNumber) },
      "Vapi webhook received",
    );

    if (message.call?.id && callerNumber) {
      const existing = this.sessions.getByVapiCallId(message.call.id);
      this.sessions.upsert({
        twilioCallSid: existing?.twilioCallSid ?? `vapi-only:${message.call.id}`,
        callerNumber,
        vapiCallId: message.call.id,
        contactId: existing?.contactId,
      });
    }

    switch (message.type) {
      case "assistant-request":
        res.status(200).json(this.assistantRequest());
        return;
      case "tool-calls":
      case "function-call":
        res.status(200).json({
          results: await executeToolCalls(message, {
            env: this.env,
            ghl: this.ghl,
            sessions: this.sessions,
            call: message.call,
            callerNumber,
          }),
        });
        return;
      case "transfer-destination-request":
        res.status(200).json(this.transferDestination());
        return;
      case "end-of-call-report":
        this.logger.info(
          {
            callId: message.call?.id,
            endedReason: message.endedReason,
            hasTranscript: Boolean(message.artifact?.transcript),
          },
          "End of call report",
        );
        res.status(200).json({ ok: true });
        return;
      default:
        res.status(200).json({ ok: true });
    }
  }

  private assistantRequest(): Record<string, unknown> {
    if (this.env.VAPI_ASSISTANT_ID) {
      return { assistantId: this.env.VAPI_ASSISTANT_ID };
    }
    return { error: "No receptionist is configured right now. Please call back shortly." };
  }

  private transferDestination(): Record<string, unknown> {
    if (!this.env.TRANSFER_PHONE_NUMBER) {
      return {
        error: "A live teammate is not available. Offer to take a message or book an appointment instead.",
      };
    }
    return {
      destination: {
        type: "number",
        number: this.env.TRANSFER_PHONE_NUMBER,
        message: "Connecting you to a team member now.",
      },
    };
  }
}
