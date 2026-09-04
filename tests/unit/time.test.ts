import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { addMinutes, clampRangeToMaxDays, formatSlotLabel, parseDateInput } from "../../src/utils/time";

describe("parseDateInput", () => {
  it("parses today and tomorrow", () => {
    const zone = "America/New_York";
    const today = parseDateInput("today", zone);
    const tomorrow = parseDateInput("tomorrow", zone);
    expect(tomorrow.diff(today, "days").days).toBe(1);
  });

  it("parses ISO dates", () => {
    const parsed = parseDateInput("2026-09-08", "America/New_York");
    expect(parsed.toISODate()).toBe("2026-09-08");
  });
});

describe("formatSlotLabel", () => {
  it("formats a slot in the requested timezone", () => {
    const label = formatSlotLabel("2026-09-08T14:00:00-04:00", "America/New_York");
    expect(label).toContain("September 8");
    expect(label).toContain("2:00 PM");
  });
});

describe("addMinutes and clamp", () => {
  it("adds appointment duration", () => {
    expect(addMinutes("2026-09-08T14:00:00-04:00", 30, "America/New_York")).toContain("14:30");
  });

  it("clamps ranges longer than 31 days", () => {
    const start = DateTime.fromISO("2026-09-01", { zone: "utc" });
    const end = start.plus({ days: 60 });
    const clamped = clampRangeToMaxDays(start, end, 31);
    expect(Math.round(clamped.end.diff(clamped.start, "days").days)).toBeLessThanOrEqual(31);
  });
});
