import { request as undiciRequest } from "undici";
import { UpstreamError } from "../utils/errors";

export interface HttpRequest {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  query?: Record<string, string | number | undefined>;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export interface HttpTransport {
  request<T>(req: HttpRequest): Promise<HttpResponse<T>>;
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

export class FetchHttpTransport implements HttpTransport {
  constructor(private readonly defaultTimeoutMs = 4000) {}

  async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    const url = withQuery(req.url, req.query);
    const timeoutMs = req.timeoutMs ?? this.defaultTimeoutMs;
    const maxAttempts = 2;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await undiciRequest(url, {
          method: req.method,
          headers: {
            accept: "application/json",
            ...(req.body !== undefined ? { "content-type": "application/json" } : {}),
            ...req.headers,
          },
          body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
          signal: controller.signal,
          bodyTimeout: timeoutMs,
          headersTimeout: timeoutMs,
        });

        const text = await response.body.text();
        const data = text ? safeJson(text) : ({} as T);
        const headers = headerRecord(response.headers);

        if (response.statusCode >= 400) {
          const error = new UpstreamError("http", `Upstream responded ${response.statusCode}`, {
            statusCode: response.statusCode >= 500 ? 502 : 400,
            details: { status: response.statusCode, body: data, url },
          });
          if (attempt < maxAttempts && RETRYABLE.has(response.statusCode)) {
            await sleep(retryDelayMs(headers, attempt));
            lastError = error;
            continue;
          }
          throw error;
        }

        return { status: response.statusCode, data: data as T, headers };
      } catch (error) {
        lastError = error;
        const retryable = isRetryableNetworkError(error) && attempt < maxAttempts;
        if (!retryable) {
          if (error instanceof UpstreamError) {
            throw error;
          }
          throw new UpstreamError("http", error instanceof Error ? error.message : "HTTP request failed", {
            cause: error,
            details: { url },
          });
        }
        await sleep(100 * attempt);
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError instanceof Error ? lastError : new UpstreamError("http", "HTTP request failed");
  }
}

function withQuery(url: string, query?: HttpRequest["query"]): string {
  if (!query) {
    return url;
  }
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      parsed.searchParams.set(key, String(value));
    }
  }
  return parsed.toString();
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function headerRecord(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      output[key.toLowerCase()] = value;
    } else if (Array.isArray(value) && value[0]) {
      output[key.toLowerCase()] = value[0];
    }
  }
  return output;
}

function retryDelayMs(headers: Record<string, string>, attempt: number): number {
  const retryAfter = headers["retry-after"];
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 1500);
    }
  }
  return 150 * attempt;
}

function isRetryableNetworkError(error: unknown): boolean {
  if (error instanceof UpstreamError) {
    const status = (error.details as { status?: number } | undefined)?.status;
    return typeof status === "number" && RETRYABLE.has(status);
  }
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
