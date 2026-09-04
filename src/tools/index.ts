import { toErrorMessage, ValidationError } from "../utils/errors";
import { bookAppointmentTool } from "./bookAppointment.tool";
import { checkAvailabilityTool } from "./checkAvailability.tool";
import { createContactTool } from "./createContact.tool";
import { getContactTool } from "./getContact.tool";
import { toolCallArguments, type NormalizedToolCall, type ToolContext, type ToolDefinition } from "./types";
import type { VapiServerMessage, VapiToolCall, VapiToolResult } from "../types/vapi";

const tools: ToolDefinition[] = [checkAvailabilityTool, getContactTool, createContactTool, bookAppointmentTool];

const registry = new Map<string, ToolDefinition>();
for (const tool of tools) {
  registry.set(tool.name, tool);
  for (const alias of tool.aliases ?? []) {
    registry.set(alias, tool);
  }
}

export function listTools(): Array<{ name: string; aliases: string[]; description: string }> {
  return tools.map((tool) => ({
    name: tool.name,
    aliases: tool.aliases ?? [],
    description: tool.description,
  }));
}

export function extractToolCalls(message: VapiServerMessage): NormalizedToolCall[] {
  if (message.toolCallList && message.toolCallList.length > 0) {
    return message.toolCallList.map((toolCall) => normalize(toolCall));
  }

  if (message.functionCall?.name) {
    return [
      {
        id: "function-call",
        name: message.functionCall.name,
        arguments: message.functionCall.arguments ?? message.functionCall.parameters ?? {},
      },
    ];
  }

  return [];
}

export async function executeToolCalls(message: VapiServerMessage, context: ToolContext): Promise<VapiToolResult[]> {
  const calls = extractToolCalls(message);
  if (calls.length === 0) {
    return [
      {
        toolCallId: "unknown",
        result: JSON.stringify({
          ok: false,
          spoken: "I did not receive a tool name. Apologize and ask the caller to repeat their request.",
        }),
      },
    ];
  }

  return Promise.all(calls.map((call) => executeSingle(call, context)));
}

async function executeSingle(call: NormalizedToolCall, context: ToolContext): Promise<VapiToolResult> {
  const tool = registry.get(call.name);
  if (!tool) {
    return {
      name: call.name,
      toolCallId: call.id,
      result: JSON.stringify({
        ok: false,
        spoken: `The ${call.name} action is not available. Offer a callback from a team member.`,
      }),
    };
  }

  try {
    const output = await tool.execute(call.arguments, context);
    return {
      name: tool.name,
      toolCallId: call.id,
      result: typeof output === "string" ? output : JSON.stringify(output),
    };
  } catch (error) {
    const spoken =
      error instanceof ValidationError
        ? error.message
        : `There was a technical issue while running ${tool.name}. Tell the caller a teammate will follow up shortly.`;
    return {
      name: tool.name,
      toolCallId: call.id,
      result: JSON.stringify({
        ok: false,
        spoken,
        error: toErrorMessage(error),
      }),
    };
  }
}

function normalize(toolCall: VapiToolCall): NormalizedToolCall {
  return {
    id: toolCall.id,
    name: toolCall.name,
    arguments: toolCallArguments(toolCall),
  };
}

export { type ToolContext } from "./types";
