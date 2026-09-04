import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { IncomingMessage } from "node:http";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
          "img-src": ["'self'", "data:"],
          "script-src": ["'self'", "'unsafe-inline'"],
          "connect-src": ["'self'"],
        },
      },
    }),
  );
  app.use(cors());
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req: IncomingMessage) => {
          const url = req.url || "";
          return url === "/health" || url === "/health/ready";
        },
      },
    }),
  );

  // Twilio posts application/x-www-form-urlencoded; Vapi posts JSON
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json({ limit: "1mb" }));

  app.use(express.static(publicDir, { index: false }));

  app.get("/", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  app.get("/api", (_req, res) => {
    res.status(200).json({
      service: "ai-voice-receptionist",
      docs: "See README.md",
      interface: "/",
      health: "/health",
      tools: "/tools/definitions",
    });
  });

  app.use(apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
