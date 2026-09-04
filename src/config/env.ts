import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { ConfigError } from "../utils/errors";

loadDotenv();

const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  });

const optionalCsv = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  WEBHOOK_BASE_URL: z.string().url().optional(),

  VALIDATE_TWILIO_SIGNATURE: booleanFromEnv.optional(),
  VALIDATE_VAPI_SIGNATURE: booleanFromEnv.optional(),

  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_PHONE_NUMBER: z.string().min(1).optional(),

  VAPI_API_KEY: z.string().min(1).optional(),
  VAPI_API_BASE_URL: z.string().url().default("https://api.vapi.ai"),
  VAPI_ASSISTANT_ID: z.string().min(1).optional(),
  VAPI_PHONE_NUMBER_ID: z.string().min(1).optional(),
  VAPI_WEBHOOK_SECRET: z.string().min(1).optional(),

  GHL_API_KEY: z.string().min(1).optional(),
  GHL_LOCATION_ID: z.string().min(1).optional(),
  GHL_CALENDAR_ID: z.string().min(1).optional(),
  GHL_API_BASE_URL: z.string().url().default("https://services.leadconnectorhq.com"),
  GHL_TIMEZONE: z.string().min(1).default("America/New_York"),
  GHL_APPOINTMENT_DURATION_MINUTES: z.coerce.number().int().min(5).max(480).default(30),
  GHL_CONTACT_SOURCE: z.string().min(1).default("Voice Receptionist"),
  GHL_CONTACT_TAGS: optionalCsv,
  GHL_CONTACTS_API_VERSION: z.string().min(1).default("2021-07-28"),
  GHL_CALENDARS_API_VERSION: z.string().min(1).default("2021-04-15"),

  TRANSFER_PHONE_NUMBER: z.string().min(1).optional(),

  GHL_TIMEOUT_MS: z.coerce.number().int().min(500).max(15000).default(4000),
  VAPI_TIMEOUT_MS: z.coerce.number().int().min(500).max(15000).default(5000),
});

export type Env = z.infer<typeof envSchema> & {
  validateTwilioSignature: boolean;
  validateVapiSignature: boolean;
};

export function loadEnv(overrides: Record<string, string | undefined> = {}): Env {
  const merged = { ...process.env, ...overrides };
  const parsed = envSchema.safeParse(merged);
  if (!parsed.success) {
    throw new ConfigError("Invalid environment configuration", parsed.error.flatten());
  }

  const data = parsed.data;
  const isProduction = data.NODE_ENV === "production";

  return {
    ...data,
    validateTwilioSignature: data.VALIDATE_TWILIO_SIGNATURE ?? isProduction,
    validateVapiSignature: data.VALIDATE_VAPI_SIGNATURE ?? isProduction,
  };
}

export function assertRuntimeSecrets(env: Env): void {
  const missing: string[] = [];
  const required = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "VAPI_API_KEY",
    "VAPI_ASSISTANT_ID",
    "VAPI_PHONE_NUMBER_ID",
    "GHL_API_KEY",
    "GHL_LOCATION_ID",
    "GHL_CALENDAR_ID",
  ] as const;

  for (const key of required) {
    if (!env[key]) {
      missing.push(key);
    }
  }

  if (env.validateVapiSignature && !env.VAPI_WEBHOOK_SECRET) {
    missing.push("VAPI_WEBHOOK_SECRET");
  }
  if (env.validateTwilioSignature && !env.WEBHOOK_BASE_URL && env.NODE_ENV === "production") {
    missing.push("WEBHOOK_BASE_URL");
  }

  if (missing.length > 0 && env.NODE_ENV !== "test") {
    throw new ConfigError(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
