import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "ai-voice-receptionist",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/ready", (_req, res) => {
  res.status(200).json({
    ok: true,
    ready: true,
  });
});
