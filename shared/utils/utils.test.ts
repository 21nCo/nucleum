import { describe, it, expect } from "vitest";
import {
  extractProduct,
  isUrlMatchPattern,
  isValidUrl,
  sanitize
} from "@21n/shared-utils/utils";

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

describe("extractProduct", () => {
  it("treats local app subdomains as the local environment", () => {
    expect(extractProduct("local.nucleum.app")).toEqual({
      env: "local",
      product: "nucleum"
    });
    expect(extractProduct("local.memotron.app")).toEqual({
      env: "local",
      product: "memotron"
    });
  });
});

describe("isUrlMatchPattern", () => {
  it("accepts http, https, and protocol-relative links", () => {
    expect(isUrlMatchPattern("https://example.com/path")).toBe(true);
    expect(isUrlMatchPattern("example.com/path")).toBe(true);
    expect(isUrlMatchPattern("//example.com/path")).toBe(true);
  });

  it("rejects unsupported schemes and whitespace", () => {
    expect(isUrlMatchPattern("javascript:alert(1)")).toBe(false);
    expect(isUrlMatchPattern("vbscript:alert(1)")).toBe(false);
    expect(isUrlMatchPattern("example .com")).toBe(false);
  });
});

describe("sanitize", () => {
  it("keeps trusted gist and gitlab script embeds as normalized embed URLs", () => {
    expect(
      sanitize(
        '<script src="https://gist.github.com/example/abc123.js"></script>'
      )
    ).toEqual({
      embed: "https://gist.github.com/example/abc123",
      isGist: true
    });
    expect(
      sanitize('<script src="https://gitlab.com/-/snippets/12345.js"></script>')
    ).toEqual({
      embed: "https://gitlab.com/-/snippets/12345",
      isGist: true
    });
  });

  it("strips unsafe html instead of trying to filter dangerous fragments in place", () => {
    expect(
      sanitize('<img src=x onerror="alert(1)">hello<script >bad</script>')
    ).toBe("hellobad");
  });

  it("allows media embeds only with http or https src values", () => {
    expect(
      sanitize('<iframe src="https://example.com/embed"></iframe>')
    ).toEqual({
      embed: "https://example.com/embed"
    });
    expect(() => sanitize('<iframe src="vbscript:alert(1)"></iframe>')).toThrow(
      "Invalid URL"
    );
  });
});
