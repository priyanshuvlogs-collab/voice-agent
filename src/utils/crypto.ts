import { timingSafeEqual } from "node:crypto";

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function extractBearerOrSecret(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const authorization = firstHeader(headers.authorization);
  if (authorization) {
    return authorization.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : authorization.trim();
  }
  const legacy = firstHeader(headers["x-vapi-secret"]);
  return legacy?.trim();
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
