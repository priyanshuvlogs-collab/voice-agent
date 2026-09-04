import pino, { type Logger } from "pino";
import type { Env } from "./env";

export function createLogger(env: Env): Logger {
  const pretty = env.NODE_ENV !== "production" && env.NODE_ENV !== "test";

  return pino({
    level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
    base: { service: "voice-agent", env: env.NODE_ENV },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers['x-vapi-secret']",
        "req.headers['x-twilio-signature']",
        "*.TWILIO_AUTH_TOKEN",
        "*.VAPI_API_KEY",
        "*.VAPI_WEBHOOK_SECRET",
        "*.GHL_API_KEY",
      ],
      censor: "***",
    },
    transport: pretty
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        }
      : undefined,
  });
}
