const SENSITIVE_KEY = /(authorization|token|secret|password|api[_-]?key|auth)/i;

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > 8 ? `${value.slice(0, 2)}***${value.slice(-2)}` : "***";
  }
  return "***";
}

export function redactDeep<T>(input: T, depth = 0): T {
  if (depth > 6 || input === null || input === undefined) {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => redactDeep(item, depth + 1)) as T;
  }
  if (typeof input === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY.test(key) ? redactValue(value) : redactDeep(value, depth + 1);
    }
    return output as T;
  }
  return input;
}
