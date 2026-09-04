import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizePhoneE164 } from "./helpers.js";

describe("normalizePhoneE164", () => {
  it("normalizes 10-digit US numbers", () => {
    assert.equal(normalizePhoneE164("(555) 123-4567"), "+15551234567");
  });

  it("preserves already-E.164 numbers", () => {
    assert.equal(normalizePhoneE164("+44 7700 900123"), "+447700900123");
  });

  it("handles 11-digit numbers starting with 1", () => {
    assert.equal(normalizePhoneE164("15551234567"), "+15551234567");
  });
});
