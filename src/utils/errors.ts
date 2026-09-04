export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly isOperational: boolean;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      details?: unknown;
      isOperational?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_ERROR";
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details,
    });
    this.name = "ValidationError";
  }
}

export class UpstreamError extends AppError {
  constructor(service: string, message: string, details?: unknown) {
    super(`${service}: ${message}`, {
      statusCode: 502,
      code: "UPSTREAM_ERROR",
      details: { service, ...(details && typeof details === "object" ? details : { details }) },
    });
    this.name = "UpstreamError";
  }
}

export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
