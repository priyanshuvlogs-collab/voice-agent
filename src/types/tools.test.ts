import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookAppointmentSchema,
  checkAvailabilitySchema,
  createContactSchema,
} from "./tools.js";

describe("tool schemas", () => {
  it("accepts check_availability payload", () => {
    const parsed = checkAvailabilitySchema.parse({
      startDate: "2026-09-05",
      endDate: "2026-09-06",
      timezone: "America/New_York",
    });
    assert.equal(parsed.startDate, "2026-09-05");
  });

  it("requires firstName + phone for create_contact", () => {
    assert.throws(() => createContactSchema.parse({ firstName: "Ada" }));
    const parsed = createContactSchema.parse({
      firstName: "Ada",
      phone: "+15551234567",
    });
    assert.equal(parsed.firstName, "Ada");
  });

  it("requires startTime for book_appointment", () => {
    const parsed = bookAppointmentSchema.parse({
      contactId: "abc",
      startTime: "2026-09-05T15:00:00.000Z",
    });
    assert.equal(parsed.contactId, "abc");
  });
});
