import type { Express } from "express";
import { createApp } from "../../src/app";
import type { HttpTransport } from "../../src/clients/http.client";
import { createLogger } from "../../src/config/logger";
import { loadEnv, type Env } from "../../src/config/env";
import { createServices, type AppServices } from "../../src/container";

export function buildTestApp(
  http: HttpTransport,
  envOverrides: Record<string, string | undefined> = {},
): { app: Express; env: Env; services: AppServices } {
  const env = loadEnv(envOverrides);
  const logger = createLogger(env);
  const services = createServices({ env, logger, http });
  return { app: createApp(env, logger, services), env, services };
}
