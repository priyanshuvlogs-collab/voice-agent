import type { RequestHandler } from "express";
import type { Env } from "../config/env";
import { UnauthorizedError } from "../utils/errors";
import { extractBearerOrSecret, safeEqual } from "../utils/crypto";

export function vapiAuth(env: Env): RequestHandler {
  return (req, _res, next) => {
    if (!env.validateVapiSignature) {
      next();
      return;
    }
    if (!env.VAPI_WEBHOOK_SECRET) {
      next(new UnauthorizedError("VAPI_WEBHOOK_SECRET is not configured"));
      return;
    }

    const provided = extractBearerOrSecret(req.headers);
    if (!provided || !safeEqual(provided, env.VAPI_WEBHOOK_SECRET)) {
      next(new UnauthorizedError("Invalid Vapi webhook secret"));
      return;
    }
    next();
  };
}
