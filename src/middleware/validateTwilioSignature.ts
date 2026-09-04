import type { RequestHandler } from "express";
import twilio from "twilio";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Validates Twilio request signatures when enabled.
 * Requires the raw URL (PUBLIC_BASE_URL + path) for accurate validation behind proxies.
 */
export const validateTwilioSignature: RequestHandler = (req, res, next) => {
  if (!env.TWILIO_VALIDATE_SIGNATURE || env.NODE_ENV === "test") {
    next();
    return;
  }

  const signature = req.header("X-Twilio-Signature");
  if (!signature) {
    res.status(403).type("text/xml").send("<Response><Say>Unauthorized</Say></Response>");
    return;
  }

  const protocol = (req.header("x-forwarded-proto") || req.protocol).split(",")[0]?.trim();
  const host = req.header("x-forwarded-host") || req.header("host");
  const configuredBase = env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  const url = configuredBase
    ? `${configuredBase}${req.originalUrl}`
    : `${protocol}://${host}${req.originalUrl}`;

  const params = (req.body ?? {}) as Record<string, string>;
  const valid = twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, params);

  if (!valid) {
    logger.warn({ url }, "Invalid Twilio signature");
    res.status(403).type("text/xml").send("<Response><Say>Unauthorized</Say></Response>");
    return;
  }

  next();
};
