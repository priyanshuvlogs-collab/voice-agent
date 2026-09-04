import type { Env } from "../config/env";
import type { VapiCreateCallRequest, VapiCreateCallResponse } from "../types/vapi";
import { UpstreamError } from "../utils/errors";
import type { HttpTransport } from "./http.client";

export class VapiClient {
  constructor(
    private readonly env: Env,
    private readonly http: HttpTransport,
  ) {}

  async createInboundCall(payload: VapiCreateCallRequest): Promise<VapiCreateCallResponse> {
    if (!this.env.VAPI_API_KEY) {
      throw new UpstreamError("vapi", "VAPI_API_KEY is not configured", { statusCode: 500 });
    }

    try {
      const response = await this.http.request<VapiCreateCallResponse>({
        method: "POST",
        url: `${this.env.VAPI_API_BASE_URL}/call`,
        timeoutMs: this.env.VAPI_TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${this.env.VAPI_API_KEY}`,
        },
        body: payload,
      });
      return response.data;
    } catch (error) {
      if (error instanceof UpstreamError) {
        throw new UpstreamError("vapi", `Vapi call create failed: ${error.message}`, {
          statusCode: error.statusCode,
          details: error.details,
          cause: error,
        });
      }
      throw error;
    }
  }
}
