import type { Logger } from "pino";
import { FetchHttpTransport, type HttpTransport } from "./clients/http.client";
import { GhlClient } from "./clients/ghl.client";
import { VapiClient } from "./clients/vapi.client";
import type { Env } from "./config/env";
import { HealthController } from "./controllers/health.controller";
import { TwilioController } from "./controllers/twilio.controller";
import { VapiController } from "./controllers/vapi.controller";
import { CallSessionStore } from "./services/callSession.service";
import { GhlService } from "./services/ghl.service";
import { VapiService } from "./services/vapi.service";

export interface AppServices {
  env: Env;
  logger: Logger;
  sessions: CallSessionStore;
  ghl: GhlService;
  vapi: VapiService;
  healthController: HealthController;
  twilioController: TwilioController;
  vapiController: VapiController;
}

export interface CreateServicesOptions {
  env: Env;
  logger: Logger;
  http?: HttpTransport;
  sessions?: CallSessionStore;
}

export function createServices(options: CreateServicesOptions): AppServices {
  const http = options.http ?? new FetchHttpTransport(options.env.GHL_TIMEOUT_MS);
  const sessions = options.sessions ?? new CallSessionStore();
  const ghl = new GhlService(options.env, new GhlClient(options.env, http));
  const vapi = new VapiService(options.env, new VapiClient(options.env, http));

  return {
    env: options.env,
    logger: options.logger,
    sessions,
    ghl,
    vapi,
    healthController: new HealthController(options.env, sessions),
    twilioController: new TwilioController(vapi, sessions, options.logger),
    vapiController: new VapiController(options.env, ghl, sessions, options.logger),
  };
}
