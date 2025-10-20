import { describe, it, expect } from "vitest";
import { isValidUrl } from "@21n/shared-utils/utils";

describe("isValidUrl", () => {
  it("should return true for valid URLs", () => {
    const validUrls = [
      "https://example.com",
      "https://sub.domain.com/path?query=1",
      "http://192.168.1.1",
      "https://docs.google.com/document/d/1IA9Z5rcIm_KRxvh_L42d2NDdYRHZ72MfszhyJrsmf5A/edit?tab=t.0#heading=h.vo0i6g1qeifg"
    ];

    validUrls.forEach((url) => {
      expect(isValidUrl(url)).toBe(true);
    });
  });

  it("should return false for invalid URLs", () => {
    const invalidUrls = [
      "not-a-url",
      "http://",
      "https://",
      "",
      "ftp://invalid",
      "http://invalid.",
      undefined,
      null
    ];

    invalidUrls.forEach((url) => {
      expect(isValidUrl(url)).toBe(false);
    });
  });
});
