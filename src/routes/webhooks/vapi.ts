import { Router } from "express";
import { handleVapiWebhook } from "../../controllers/webhookController.js";
import { validateVapiSecret } from "../../middleware/validateVapiSecret.js";

export const vapiRouter = Router();

vapiRouter.post("/", validateVapiSecret, (req, res, next) => {
  handleVapiWebhook(req, res).catch(next);
});
