import { Router } from "express";
import { handleTwilioVoiceWebhook } from "../../controllers/webhookController.js";
import { validateTwilioSignature } from "../../middleware/validateTwilioSignature.js";

export const twilioRouter = Router();

twilioRouter.post("/voice", validateTwilioSignature, (req, res, next) => {
  handleTwilioVoiceWebhook(req, res).catch(next);
});
