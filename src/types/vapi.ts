export type VapiMessageType =
  | "assistant-request"
  | "tool-calls"
  | "function-call"
  | "transfer-destination-request"
  | "status-update"
  | "end-of-call-report"
  | "hang"
  | "conversation-update"
  | "transcript"
  | "speech-update"
  | "user-interrupted"
  | string;

export interface VapiCustomer {
  number?: string;
  name?: string;
}

export interface VapiCall {
  id?: string;
  orgId?: string;
  type?: string;
  phoneNumberId?: string;
  customer?: VapiCustomer;
  metadata?: Record<string, unknown>;
}

export interface VapiToolCall {
  id: string;
  name: string;
  arguments?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

export interface VapiToolCallsMessage {
  type: "tool-calls" | "function-call";
  timestamp?: number;
  call?: VapiCall;
  customer?: VapiCustomer;
  toolCallList?: VapiToolCall[];
  functionCall?: {
    name: string;
    parameters?: Record<string, unknown>;
    arguments?: Record<string, unknown>;
  };
  artifact?: {
    messages?: unknown[];
    transcript?: string;
  };
}

export interface VapiServerMessage {
  type: VapiMessageType;
  timestamp?: number;
  call?: VapiCall;
  customer?: VapiCustomer;
  status?: string;
  endedReason?: string;
  toolCallList?: VapiToolCall[];
  functionCall?: VapiToolCallsMessage["functionCall"];
  artifact?: {
    transcript?: string;
    recording?: { stereoUrl?: string; mono?: { combinedUrl?: string } };
    messages?: unknown[];
  };
}

export interface VapiWebhookBody {
  message: VapiServerMessage;
}

export interface VapiToolResult {
  name?: string;
  toolCallId: string;
  result: string;
}

export interface VapiCreateCallRequest {
  phoneNumberId: string;
  assistantId: string;
  phoneCallProviderBypassEnabled: true;
  customer: { number: string; name?: string };
  metadata?: Record<string, unknown>;
}

export interface VapiCreateCallResponse {
  id: string;
  phoneCallProviderDetails?: {
    twiml?: string;
  };
}
