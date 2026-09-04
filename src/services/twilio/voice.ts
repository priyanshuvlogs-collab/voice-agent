import twilio from "twilio";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

let client: ReturnType<typeof twilio> | null = null;

export function getTwilioClient(): ReturnType<typeof twilio> {
  if (!client) {
    client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

/**
 * Build TwiML that greets the caller and connects the call into Vapi.
 *
 * Preferred production setup: attach the Twilio number in the Vapi dashboard
 * so Vapi owns media. This webhook remains useful for logging, custom routing,
 * and environments that still terminate on Twilio first.
 */
export function buildInboundVoiceTwiml(options?: {
  sayText?: string;
  connectUrl?: string;
}): string {
  const response = new twilio.twiml.VoiceResponse();
  const sayText =
    options?.sayText ??
    `Thank you for calling ${env.BUSINESS_NAME}. Please hold while I connect you.`;

  response.say({ voice: "Polly.Joanna" }, sayText);

  // If a Vapi/SIP connect URL is configured, dial it; otherwise pause briefly
  // so an externally managed Vapi number can take over media.
  if (options?.connectUrl) {
    const dial = response.dial({ answerOnBridge: true });
    dial.sip(options.connectUrl);
  } else {
    response.pause({ length: 1 });
  }

  return response.toString();
}

export function logInboundCall(payload: {
  callSid?: string;
  from?: string;
  to?: string;
}): void {
  logger.info(
    {
      callSid: payload.callSid,
      from: payload.from,
      to: payload.to,
    },
    "Inbound Twilio voice call",
  );
}
