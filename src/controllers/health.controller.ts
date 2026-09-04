import type { Request, Response } from "express";
import type { Env } from "../config/env";
import type { CallSessionStore } from "../services/callSession.service";
import { listTools } from "../tools";

export class HealthController {
  constructor(
    private readonly env: Env,
    private readonly sessions: CallSessionStore,
    private readonly startedAt = Date.now(),
  ) {}

  live(_req: Request, res: Response): void {
    res.status(200).json({
      status: "ok",
      service: "voice-agent",
      uptimeSec: Math.round((Date.now() - this.startedAt) / 1000),
    });
  }

  ready(_req: Request, res: Response): void {
    const configured = Boolean(
      this.env.GHL_API_KEY && this.env.VAPI_API_KEY && this.env.TWILIO_ACCOUNT_SID,
    );
    res.status(configured || this.env.NODE_ENV === "test" ? 200 : 503).json({
      status: configured || this.env.NODE_ENV === "test" ? "ready" : "not_ready",
      checks: {
        ghl: Boolean(this.env.GHL_API_KEY && this.env.GHL_LOCATION_ID && this.env.GHL_CALENDAR_ID),
        vapi: Boolean(this.env.VAPI_API_KEY && this.env.VAPI_ASSISTANT_ID && this.env.VAPI_PHONE_NUMBER_ID),
        twilio: Boolean(this.env.TWILIO_ACCOUNT_SID && this.env.TWILIO_AUTH_TOKEN),
      },
      activeCalls: this.sessions.size(),
    });
  }

  tools(_req: Request, res: Response): void {
    res.status(200).json({ tools: listTools() });
  }
}
