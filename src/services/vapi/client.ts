import { env } from "../../config/env.js";
import { UpstreamError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

const VAPI_BASE = "https://api.vapi.ai";

export interface VapiOutboundCallInput {
  customerNumber: string;
  assistantId?: string;
  phoneNumberId?: string;
  metadata?: Record<string, unknown>;
}

export async function createVapiOutboundCall(
  input: VapiOutboundCallInput,
): Promise<unknown> {
  const phoneNumberId = input.phoneNumberId || env.VAPI_PHONE_NUMBER_ID;
  if (!phoneNumberId) {
    throw new UpstreamError("Vapi", "VAPI_PHONE_NUMBER_ID is required for outbound calls");
  }

  const body = {
    assistantId: input.assistantId || env.VAPI_ASSISTANT_ID,
    phoneNumberId,
    customer: { number: input.customerNumber },
    metadata: input.metadata,
  };

  let response: Response;
  try {
    response = await fetch(`${VAPI_BASE}/call/phone`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new UpstreamError("Vapi", "Network request failed", { cause: err });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new UpstreamError("Vapi", `HTTP ${response.status}`, { payload });
  }

  logger.info({ customerNumber: input.customerNumber }, "Created Vapi outbound call");
  return payload;
}

export { executeToolCall, vapiToolDefinitions } from "./tools.js";
