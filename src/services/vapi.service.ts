import type { Env } from "../config/env";
import type { VapiClient } from "../clients/vapi.client";
import { UpstreamError } from "../utils/errors";

export class VapiService {
  constructor(
    private readonly env: Env,
    private readonly client: VapiClient,
  ) {}

  async createInboundTwiml(params: {
    callerNumber: string;
    twilioCallSid: string;
    calledNumber?: string;
  }): Promise<{ twiml: string; vapiCallId: string }> {
    if (!this.env.VAPI_ASSISTANT_ID || !this.env.VAPI_PHONE_NUMBER_ID) {
      throw new UpstreamError("vapi", "VAPI_ASSISTANT_ID and VAPI_PHONE_NUMBER_ID are required", {
        statusCode: 500,
      });
    }

    const call = await this.client.createInboundCall({
      phoneNumberId: this.env.VAPI_PHONE_NUMBER_ID,
      assistantId: this.env.VAPI_ASSISTANT_ID,
      phoneCallProviderBypassEnabled: true,
      customer: { number: params.callerNumber },
      metadata: {
        twilioCallSid: params.twilioCallSid,
        calledNumber: params.calledNumber,
      },
    });

    const twiml = call.phoneCallProviderDetails?.twiml;
    if (!twiml) {
      throw new UpstreamError("vapi", "Vapi did not return TwiML for the inbound call", { details: call });
    }

    return { twiml, vapiCallId: call.id };
  }
}
