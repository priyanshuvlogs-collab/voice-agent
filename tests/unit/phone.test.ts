import { describe, expect, it } from "vitest";
import { maskPhone, normalizePhone } from "../../src/utils/phone";

describe("normalizePhone", () => {
  it("normalizes 10-digit US numbers", () => {
    expect(normalizePhone("(555) 123-4567")).toBe("+15551234567");
  });

  it("keeps valid E.164 numbers", () => {
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("returns undefined for empty input", () => {
    expect(normalizePhone(" ")).toBeUndefined();
  });
});

describe("maskPhone", () => {
  it("keeps the last four digits", () => {
    expect(maskPhone("+15551234567")).toBe("***4567");
  });
});
