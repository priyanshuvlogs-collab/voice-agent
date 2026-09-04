import type { RequestHandler } from "express";
import twilio from "twilio";
import type { Env } from "../config/env";
import { UnauthorizedError } from "../utils/errors";

export function twilioAuth(env: Env): RequestHandler {
  return (req, _res, next) => {
    if (!env.validateTwilioSignature) {
      next();
      return;
    }
    if (!env.TWILIO_AUTH_TOKEN) {
      next(new UnauthorizedError("TWILIO_AUTH_TOKEN is not configured"));
      return;
    }

    const signature = req.header("x-twilio-signature");
    if (!signature) {
      next(new UnauthorizedError("Missing Twilio signature"));
      return;
    }

    const url = webhookUrl(env, req.originalUrl);
    const valid = twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, req.body ?? {});
    if (!valid) {
      next(new UnauthorizedError("Invalid Twilio signature"));
      return;
    }
    next();
  };
}

function webhookUrl(env: Env, originalUrl: string): string {
  if (env.WEBHOOK_BASE_URL) {
    return `${env.WEBHOOK_BASE_URL.replace(/\/$/, "")}${originalUrl}`;
  }
  return `https://localhost${originalUrl}`;
}
