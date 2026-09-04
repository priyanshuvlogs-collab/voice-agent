export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly expose: boolean;
  readonly details?: unknown;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      expose?: boolean;
      details?: unknown;
      cause?: unknown;
    } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "internal_error";
    this.expose = options.expose ?? this.statusCode < 500;
    this.details = options.details;
  }
}

export class ConfigError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 500, code: "config_error", expose: false, details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, { statusCode: 401, code: "unauthorized", expose: true });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { statusCode: 400, code: "validation_error", expose: true, details });
  }
}

export class UpstreamError extends AppError {
  readonly upstream: string;

  constructor(upstream: string, message: string, options: { statusCode?: number; details?: unknown; cause?: unknown } = {}) {
    super(message, {
      statusCode: options.statusCode ?? 502,
      code: `${upstream}_error`,
      expose: false,
      details: options.details,
      cause: options.cause,
    });
    this.upstream = upstream;
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
