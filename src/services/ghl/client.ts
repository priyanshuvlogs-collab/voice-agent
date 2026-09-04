import { env } from "../../config/env.js";
import { UpstreamError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

export interface GhlRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  idempotencyKey?: string;
}

function buildQuery(query?: GhlRequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function ghlRequest<T>(options: GhlRequestOptions): Promise<T> {
  const method = options.method ?? "GET";
  const url = `${env.GHL_API_BASE_URL}${options.path}${buildQuery(options.query)}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.GHL_API_KEY}`,
    Version: env.GHL_API_VERSION,
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  const started = Date.now();
  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    throw new UpstreamError("GoHighLevel", "Network request failed", { cause: err, url });
  }

  const elapsedMs = Date.now() - started;
  const text = await response.text();
  let payload: unknown = undefined;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  logger.debug(
    {
      method,
      path: options.path,
      status: response.status,
      elapsedMs,
    },
    "GHL request completed",
  );

  if (!response.ok) {
    throw new UpstreamError("GoHighLevel", `HTTP ${response.status}`, {
      status: response.status,
      path: options.path,
      payload,
    });
  }

  return payload as T;
}
