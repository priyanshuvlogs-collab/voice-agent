import { Router } from "express";
import { handleToolExecution } from "../../controllers/webhookController.js";
import { validateVapiSecret } from "../../middleware/validateVapiSecret.js";
import { vapiToolDefinitions } from "../../services/vapi/tools.js";

export const toolsRouter = Router();

toolsRouter.get("/definitions", (_req, res) => {
  res.status(200).json({ tools: vapiToolDefinitions });
});

toolsRouter.post("/", validateVapiSecret, (req, res, next) => {
  handleToolExecution(req, res).catch(next);
});

toolsRouter.post("/:toolName", validateVapiSecret, (req, res, next) => {
  handleToolExecution(req, res).catch(next);
});
