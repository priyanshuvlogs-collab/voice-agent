import { Router } from "express";
import type { HealthController } from "../controllers/health.controller";
import type { TwilioController } from "../controllers/twilio.controller";
import type { VapiController } from "../controllers/vapi.controller";
import type { Env } from "../config/env";
import { healthRoutes } from "./health.routes";
import { twilioRoutes } from "./twilio.routes";
import { vapiRoutes } from "./vapi.routes";

export function buildRouter(params: {
  env: Env;
  health: HealthController;
  twilio: TwilioController;
  vapi: VapiController;
}): Router {
  const router = Router();
  router.use(healthRoutes(params.health));
  router.use("/webhooks/twilio", twilioRoutes(params.env, params.twilio));
  router.use("/webhooks/vapi", vapiRoutes(params.env, params.vapi));
  return router;
}
