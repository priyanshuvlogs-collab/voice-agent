import { describe, expect, it } from "vitest";
import { extractBearerOrSecret, safeEqual } from "../../src/utils/crypto";

describe("safeEqual", () => {
  it("accepts matching secrets", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
  });
});

describe("extractBearerOrSecret", () => {
  it("reads a bearer token", () => {
    expect(extractBearerOrSecret({ authorization: "Bearer secret-token" })).toBe("secret-token");
  });

  it("reads the legacy X-Vapi-Secret header", () => {
    expect(extractBearerOrSecret({ "x-vapi-secret": "legacy-secret" })).toBe("legacy-secret");
  });
});
