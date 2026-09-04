import compression from "compression";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { Logger } from "pino";
import type { Env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { requestContext } from "./middleware/requestContext";
import { requestLogger } from "./middleware/requestLogger";
import { buildRouter } from "./routes";
import type { AppServices } from "./container";

export function createApp(env: Env, logger: Logger, services: AppServices): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("env", env.NODE_ENV);
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(compression());
  app.use(requestContext);
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false, limit: "32kb" }));
  app.use(requestLogger(logger));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 240,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === "/health" || req.path === "/ready",
    }),
  );

  app.use(
    buildRouter({
      env,
      health: services.healthController,
      twilio: services.twilioController,
      vapi: services.vapiController,
    }),
  );

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "not_found", message: "Not found" } });
  });
  app.use(errorHandler(logger));
  return app;
}
