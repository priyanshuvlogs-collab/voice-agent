import type { NextFunction, Request, Response } from "express";
import { AppError, toErrorMessage } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    error: "NOT_FOUND",
    message: "Route not found",
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    logger.warn(
      {
        err,
        code: err.code,
        statusCode: err.statusCode,
        details: err.details,
      },
      err.message,
    );
    res.status(err.statusCode).json({
      ok: false,
      error: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    ok: false,
    error: "INTERNAL_ERROR",
    message: toErrorMessage(err) || "Internal server error",
  });
}
