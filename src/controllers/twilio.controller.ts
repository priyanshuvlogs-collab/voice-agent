import type { Request, Response } from "express";
import twilio from "twilio";
import type { Logger } from "pino";
import type { CallSessionStore } from "../services/callSession.service";
import type { VapiService } from "../services/vapi.service";
import { maskPhone, normalizePhone } from "../utils/phone";

export class TwilioController {
  constructor(
    private readonly vapi: VapiService,
    private readonly sessions: CallSessionStore,
    private readonly logger: Logger,
  ) {}

  async inbound(req: Request, res: Response): Promise<void> {
    const callSid = String(req.body?.CallSid ?? "");
    const caller = normalizePhone(String(req.body?.Caller ?? req.body?.From ?? "")) ?? String(req.body?.Caller ?? "");
    const called = normalizePhone(String(req.body?.Called ?? req.body?.To ?? "")) ?? String(req.body?.To ?? "");

    this.logger.info({ callSid, caller: maskPhone(caller) }, "Inbound Twilio call received");

    try {
      const { twiml, vapiCallId } = await this.vapi.createInboundTwiml({
        callerNumber: caller,
        twilioCallSid: callSid,
        calledNumber: called,
      });

      this.sessions.upsert({
        twilioCallSid: callSid,
        callerNumber: caller,
        calledNumber: called,
        vapiCallId,
      });

      res.type("text/xml").status(200).send(twiml);
    } catch (error) {
      this.logger.error({ err: error, callSid }, "Failed to hand inbound call to Vapi");
      res.type("text/xml").status(200).send(fallbackTwiml());
    }
  }

  status(req: Request, res: Response): void {
    const callSid = String(req.body?.CallSid ?? "");
    const callStatus = String(req.body?.CallStatus ?? "");
    this.logger.info({ callSid, callStatus }, "Twilio status callback");
    res.status(204).end();
  }
}

function fallbackTwiml(): string {
  const response = new twilio.twiml.VoiceResponse();
  response.say(
    { voice: "Polly.Joanna" },
    "We are sorry. Our receptionist is temporarily unavailable. Please try again in a few minutes.",
  );
  response.hangup();
  return response.toString();
}
