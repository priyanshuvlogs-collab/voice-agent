import { Router } from "express";
import type { HealthController } from "../controllers/health.controller";

export function healthRoutes(controller: HealthController): Router {
  const router = Router();
  router.get("/health", (req, res) => controller.live(req, res));
  router.get("/ready", (req, res) => controller.ready(req, res));
  router.get("/tools", (req, res) => controller.tools(req, res));
  return router;
}
