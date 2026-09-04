import type { Env } from "../config/env";
import type { CallSessionStore } from "../services/callSession.service";
import type { GhlService } from "../services/ghl.service";
import type { VapiCall, VapiToolCall } from "../types/vapi";

export interface ToolContext {
  env: Env;
  ghl: GhlService;
  sessions: CallSessionStore;
  call?: VapiCall;
  callerNumber?: string;
}

export interface ToolDefinition {
  name: string;
  aliases?: string[];
  description: string;
  execute(args: Record<string, unknown>, context: ToolContext): Promise<unknown>;
}

export interface NormalizedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
  return items.length > 0 ? items : undefined;
}

export function toolCallArguments(toolCall: VapiToolCall): Record<string, unknown> {
  return toolCall.arguments ?? toolCall.parameters ?? {};
}
