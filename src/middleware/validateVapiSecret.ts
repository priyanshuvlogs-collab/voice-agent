import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Optional shared-secret gate for Vapi server URL callbacks.
 * Configure the same value in Vapi dashboard (Server URL Secret) and VAPI_SERVER_URL_SECRET.
 */
export const validateVapiSecret: RequestHandler = (req, res, next) => {
  const expected = env.VAPI_SERVER_URL_SECRET || env.VAPI_WEBHOOK_SECRET;
  if (!expected) {
    next();
    return;
  }

  const provided =
    req.header("x-vapi-secret") ||
    req.header("x-vapi-signature") ||
    req.header("authorization")?.replace(/^Bearer\s+/i, "");

  if (!provided || provided !== expected) {
    logger.warn("Rejected Vapi webhook: invalid or missing secret");
    res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    return;
  }

  next();
};
