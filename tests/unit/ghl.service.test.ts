import { describe, expect, it } from "vitest";
import { GhlClient } from "../../src/clients/ghl.client";
import { loadEnv } from "../../src/config/env";
import { GhlService, normalizeFreeSlots } from "../../src/services/ghl.service";
import { MockHttpTransport } from "../helpers/mockHttp";

describe("normalizeFreeSlots", () => {
  it("flattens date-keyed GHL slot maps and honors the limit", () => {
    const slots = normalizeFreeSlots(
      {
        "2026-09-08": { slots: ["2026-09-08T14:00:00-04:00", "2026-09-08T14:30:00-04:00"] },
        "2026-09-09": { slots: ["2026-09-09T10:00:00-04:00"] },
        traceId: "trace",
      },
      "America/New_York",
      2,
    );
    expect(slots).toHaveLength(2);
    expect(slots[0]?.startTime).toBe("2026-09-08T14:00:00-04:00");
    expect(slots[0]?.label).toContain("2:00 PM");
  });
});

describe("GhlService", () => {
  it("checks availability against free-slots", async () => {
    const http = new MockHttpTransport((req) => {
      expect(req.url).toContain("/calendars/cal_test/free-slots");
      expect(req.headers?.Version).toBe("2021-04-15");
      return {
        data: { "2026-09-08": { slots: ["2026-09-08T14:00:00-04:00"] } },
      };
    });
    const env = loadEnv();
    const service = new GhlService(env, new GhlClient(env, http));
    const result = await service.checkAvailability({ startDate: "2026-09-08", endDate: "2026-09-08" });
    expect(result.slots).toHaveLength(1);
    expect(result.calendarId).toBe("cal_test");
  });

  it("upserts a contact then books an appointment", async () => {
    const http = new MockHttpTransport((req) => {
      if (req.url.includes("/contacts/upsert")) {
        return { data: { contact: { id: "ct_1", firstName: "Ada", phone: "+15551234567" }, new: true } };
      }
      if (req.url.includes("/calendars/events/appointments")) {
        expect(req.body).toMatchObject({
          calendarId: "cal_test",
          locationId: "loc_test",
          contactId: "ct_1",
          appointmentStatus: "confirmed",
        });
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
    const env = loadEnv();
    const service = new GhlService(env, new GhlClient(env, http));
    const booked = await service.bookAppointment({
      startTime: "2026-09-08T14:00:00-04:00",
      firstName: "Ada",
      phone: "5551234567",
    });
    expect(booked.contact.id).toBe("ct_1");
    expect(booked.appointment.id).toBe("appt_1");
    expect(http.calls).toHaveLength(2);
  });
});
