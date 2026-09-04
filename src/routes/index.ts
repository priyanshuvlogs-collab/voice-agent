import { Router } from "express";
import { healthRouter } from "./health.js";
import { toolsRouter } from "./tools/index.js";
import { twilioRouter } from "./webhooks/twilio.js";
import { vapiRouter } from "./webhooks/vapi.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/webhooks/twilio", twilioRouter);
apiRouter.use("/webhooks/vapi", vapiRouter);
apiRouter.use("/tools", toolsRouter);
