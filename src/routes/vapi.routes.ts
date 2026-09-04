import { Router } from "express";
import type { Env } from "../config/env";
import type { VapiController } from "../controllers/vapi.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { vapiAuth } from "../middleware/vapiAuth";

export function vapiRoutes(env: Env, controller: VapiController): Router {
  const router = Router();
  router.use(vapiAuth(env));
  const handler = asyncHandler((req, res) => controller.webhook(req, res));
  router.post("/", handler);
  router.post("/tools", handler);
  return router;
}
