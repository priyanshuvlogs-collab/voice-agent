import twilio from "twilio";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { UpstreamError } from "../../src/utils/errors";
import { buildTestApp } from "../helpers/app";
import { MockHttpTransport } from "../helpers/mockHttp";

describe("health routes", () => {
  it("returns liveness, readiness, and the tool catalog", async () => {
    const { app } = buildTestApp(new MockHttpTransport(() => ({ data: {} })));
    const health = await request(app).get("/health").expect(200);
    expect(health.body.status).toBe("ok");
    expect(health.body.service).toBe("voice-agent");
    expect(typeof health.body.uptimeSec).toBe("number");

    const ready = await request(app).get("/ready").expect(200);
    expect(ready.body.checks.ghl).toBe(true);

    const tools = await request(app).get("/tools").expect(200);
    expect(tools.body.tools.map((tool: { name: string }) => tool.name)).toEqual(
      expect.arrayContaining(["check_availability", "create_contact", "book_appointment", "get_contact"]),
    );
  });
});

describe("Twilio inbound webhook", () => {
  it("hands the call to Vapi and returns TwiML", async () => {
    const http = new MockHttpTransport((req) => {
      if (req.url.endsWith("/call")) {
        expect(req.body).toMatchObject({
          phoneNumberId: "pn_test",
          assistantId: "asst_test",
          phoneCallProviderBypassEnabled: true,
          customer: { number: "+15550001111" },
        });
        return {
          data: {
            id: "vapi_call_1",
            phoneCallProviderDetails: {
              twiml: '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Hello from Vapi</Say></Response>',
            },
          },
        };
      }
      throw new Error(`Unexpected URL ${req.url}`);
    });
    const { app } = buildTestApp(http);

    const res = await request(app)
      .post("/webhooks/twilio/inbound")
      .type("form")
      .send({ CallSid: "CA123", Caller: "+15550001111", Called: "+15551234567" })
      .expect(200);

    expect(res.headers["content-type"]).toMatch(/text\/xml/);
    expect(res.text).toContain("Hello from Vapi");
  });

  it("returns fallback TwiML when Vapi is unavailable", async () => {
    const http = new MockHttpTransport(() => {
      throw new UpstreamError("vapi", "Vapi down");
    });
    const { app } = buildTestApp(http);
    const res = await request(app)
      .post("/webhooks/twilio/inbound")
      .type("form")
      .send({ CallSid: "CA999", Caller: "+15550001111" })
      .expect(200);
    expect(res.text).toContain("temporarily unavailable");
  });

  it("rejects invalid Twilio signatures when validation is enabled", async () => {
    const { app } = buildTestApp(new MockHttpTransport(() => ({ data: {} })), {
      VALIDATE_TWILIO_SIGNATURE: "true",
    });
    await request(app)
      .post("/webhooks/twilio/status")
      .type("form")
      .send({ CallSid: "CA1", CallStatus: "completed" })
      .expect(401);
  });

  it("accepts a valid Twilio signature", async () => {
    const url = "https://voice.example.test/webhooks/twilio/status";
    const params = { CallSid: "CA1", CallStatus: "completed" };
    const signature = twilio.getExpectedTwilioSignature("twilio-auth-token", url, params);
    const { app } = buildTestApp(new MockHttpTransport(() => ({ data: {} })), {
      VALIDATE_TWILIO_SIGNATURE: "true",
    });
    await request(app)
      .post("/webhooks/twilio/status")
      .set("x-twilio-signature", signature)
      .type("form")
      .send(params)
      .expect(204);
  });
});

describe("Vapi tool webhooks", () => {
  it("executes GHL tools and returns Vapi results", async () => {
    const http = new MockHttpTransport((req) => {
      if (req.url.includes("/free-slots")) {
        return { data: { "2026-09-08": { slots: ["2026-09-08T14:00:00-04:00"] } } };
      }
      if (req.url.includes("/contacts/upsert")) {
        return { data: { contact: { id: "ct_1", firstName: "Ada" }, new: true } };
      }
      if (req.url.includes("/calendars/events/appointments")) {
        return {
          data: {
            id: "appt_1",
            calendarId: "cal_test",
            locationId: "loc_test",
            contactId: "ct_1",
            startTime: "2026-09-08T14:00:00-04:00",
          },
        };
      }
      throw new Error(`Unexpected URL ${req.url}`);
    });
    const { app } = buildTestApp(http);

    const availability = await request(app)
      .post("/webhooks/vapi/tools")
      .send({
        message: {
          type: "tool-calls",
          call: { id: "call_1", customer: { number: "+15550001111" } },
          toolCallList: [{ id: "t1", name: "check_availability", arguments: { startDate: "2026-09-08" } }],
        },
      })
      .expect(200);
    expect(availability.body.results[0].toolCallId).toBe("t1");
    expect(JSON.parse(availability.body.results[0].result).slots).toHaveLength(1);

    const booking = await request(app)
      .post("/webhooks/vapi")
      .send({
        message: {
          type: "tool-calls",
          call: { id: "call_1", customer: { number: "+15550001111" } },
          toolCallList: [
            {
              id: "t2",
              name: "book_appointment",
              arguments: { startTime: "2026-09-08T14:00:00-04:00", firstName: "Ada" },
            },
          ],
        },
      })
      .expect(200);
    expect(JSON.parse(booking.body.results[0].result).appointment.id).toBe("appt_1");
  });

  it("returns the configured assistant on assistant-request", async () => {
    const { app } = buildTestApp(new MockHttpTransport(() => ({ data: {} })));
    const res = await request(app)
      .post("/webhooks/vapi")
      .send({ message: { type: "assistant-request", call: { id: "call_2" } } })
      .expect(200);
    expect(res.body.assistantId).toBe("asst_test");
  });

  it("rejects unauthenticated Vapi webhooks when validation is on", async () => {
    const { app } = buildTestApp(new MockHttpTransport(() => ({ data: {} })), {
      VALIDATE_VAPI_SIGNATURE: "true",
    });
    await request(app).post("/webhooks/vapi").send({ message: { type: "status-update" } }).expect(401);

    await request(app)
      .post("/webhooks/vapi")
      .set("Authorization", "Bearer vapi-webhook-secret")
      .send({ message: { type: "status-update", status: "ended" } })
      .expect(200);
  });
});
