import type { ErrorRequestHandler } from "express";
import type { Logger } from "pino";
import { AppError } from "../utils/errors";

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, _next) => {
    const appError =
      error instanceof AppError
        ? error
        : new AppError(error instanceof Error ? error.message : "Internal server error", {
            cause: error,
          });

    logger.error(
      {
        err: error,
        requestId: req.requestId,
        code: appError.code,
        statusCode: appError.statusCode,
      },
      appError.message,
    );

    if (res.headersSent) {
      return;
    }

    res.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.expose || req.app.get("env") !== "production" ? appError.message : "Internal server error",
        requestId: req.requestId,
      },
    });
  };
}
