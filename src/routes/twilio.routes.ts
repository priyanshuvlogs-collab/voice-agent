import { Router } from "express";
import type { TwilioController } from "../controllers/twilio.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { twilioAuth } from "../middleware/twilioAuth";
import type { Env } from "../config/env";

export function twilioRoutes(env: Env, controller: TwilioController): Router {
  const router = Router();
  router.use(twilioAuth(env));
  router.post("/inbound", asyncHandler((req, res) => controller.inbound(req, res)));
  router.post("/status", (req, res) => controller.status(req, res));
  return router;
}
