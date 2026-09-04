import { createServer } from "node:http";
import { assertRuntimeSecrets, loadEnv } from "./config/env";
import { createLogger } from "./config/logger";
import { createApp } from "./app";
import { createServices } from "./container";

const env = loadEnv();
assertRuntimeSecrets(env);
const logger = createLogger(env);
const services = createServices({ env, logger });
const app = createApp(env, logger, services);
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Voice receptionist listening");
});

function shutdown(signal: string): void {
  logger.info({ signal }, "Shutting down");
  server.close((error) => {
    if (error) {
      logger.error({ err: error }, "Error during shutdown");
      process.exit(1);
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled rejection");
});
