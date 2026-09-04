import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const isTest = process.env.NODE_ENV === "test";

const requiredInRuntime = isTest
  ? z.string().optional().default("test")
  : z.string().min(1);

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  PUBLIC_BASE_URL: z.string().url().optional(),

  TWILIO_ACCOUNT_SID: requiredInRuntime,
  TWILIO_AUTH_TOKEN: requiredInRuntime,
  TWILIO_PHONE_NUMBER: requiredInRuntime,
  TWILIO_VALIDATE_SIGNATURE: z
    .string()
    .optional()
    .transform((v) => v !== "false"),

  VAPI_API_KEY: requiredInRuntime,
  VAPI_ASSISTANT_ID: requiredInRuntime,
  VAPI_PHONE_NUMBER_ID: z.string().optional().default(""),
  VAPI_WEBHOOK_SECRET: z.string().optional().default(""),
  VAPI_SERVER_URL_SECRET: z.string().optional().default(""),

  GHL_API_KEY: requiredInRuntime,
  GHL_LOCATION_ID: requiredInRuntime,
  GHL_CALENDAR_ID: requiredInRuntime,
  GHL_API_BASE_URL: z
    .string()
    .url()
    .default("https://services.leadconnectorhq.com"),
  GHL_API_VERSION: z.string().default("2021-07-28"),

  DEFAULT_TIMEZONE: z.string().default("America/New_York"),
  APPOINTMENT_DURATION_MINUTES: z.coerce.number().int().positive().default(30),
  BUSINESS_NAME: z.string().default("AI Voice Receptionist"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
