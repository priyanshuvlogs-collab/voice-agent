import { describe, expect, it } from "vitest";
import { GhlClient } from "../../src/clients/ghl.client";
import { loadEnv } from "../../src/config/env";
import { CallSessionStore } from "../../src/services/callSession.service";
import { GhlService } from "../../src/services/ghl.service";
import { executeToolCalls } from "../../src/tools";
import { MockHttpTransport } from "../helpers/mockHttp";

function context(http: MockHttpTransport) {
  const env = loadEnv();
  return {
    env,
    ghl: new GhlService(env, new GhlClient(env, http)),
    sessions: new CallSessionStore(),
    call: { id: "call_1", customer: { number: "+15551234567" } },
    callerNumber: "+15551234567",
  };
}

describe("tool dispatcher", () => {
  it("executes check_availability and returns a speakable result", async () => {
    const http = new MockHttpTransport(() => ({
      data: { "2026-09-08": { slots: ["2026-09-08T14:00:00-04:00"] } },
    }));
    const results = await executeToolCalls(
      {
        type: "tool-calls",
        toolCallList: [{ id: "tc_1", name: "checkAvailability", arguments: { startDate: "2026-09-08" } }],
      },
      context(http),
    );
    expect(results[0]?.toolCallId).toBe("tc_1");
    const parsed = JSON.parse(results[0]!.result);
    expect(parsed.ok).toBe(true);
    expect(parsed.spoken).toContain("opening");
    expect(parsed.slots).toHaveLength(1);
  });

  it("creates a contact via an alias and attaches it to the call session", async () => {
    const http = new MockHttpTransport(() => ({
      data: { contact: { id: "ct_9", firstName: "Sam", phone: "+15551234567" }, new: true },
    }));
    const ctx = context(http);
    const results = await executeToolCalls(
      {
        type: "tool-calls",
        toolCallList: [{ id: "tc_2", name: "capture_lead", arguments: { name: "Sam Rivera" } }],
      },
      ctx,
    );
    const parsed = JSON.parse(results[0]!.result);
    expect(parsed.contact.id).toBe("ct_9");
    expect(ctx.sessions.getByVapiCallId("call_1")?.contactId).toBe("ct_9");
  });

  it("returns a graceful spoken error for unknown tools", async () => {
    const results = await executeToolCalls(
      {
        type: "tool-calls",
        toolCallList: [{ id: "tc_3", name: "launch_missiles", arguments: {} }],
      },
      context(new MockHttpTransport(() => ({ data: {} }))),
    );
    const parsed = JSON.parse(results[0]!.result);
    expect(parsed.ok).toBe(false);
    expect(parsed.spoken).toContain("not available");
  });
});
