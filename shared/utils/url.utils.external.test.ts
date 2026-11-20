import { describe, expect, it } from "vitest";

import { isAllowedLocationTarget, toExternalHttpUrl } from "./url.utils";

describe("toExternalHttpUrl", () => {
  it("keeps http and https URLs", () => {
    expect(toExternalHttpUrl("https://example.com/a?b=1")).toBe(
      "https://example.com/a?b=1"
    );
    expect(toExternalHttpUrl(" http://example.com ")).toBe("http://example.com/");
  });

  it("adds https to text without a scheme", () => {
    expect(toExternalHttpUrl("example.com/path")).toBe(
      "https://example.com/path"
    );
    expect(toExternalHttpUrl("localhost:5050/x")).toBe("https://localhost:5050/x");
    expect(toExternalHttpUrl("//example.com")).toBe("https://example.com/");
  });

  it("refuses script and other non-web schemes, even when the text contains http", () => {
    for (const value of [
      "javascript:alert(document.domain)//http",
      "JavaScript:alert(1)",
      " javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd"
    ]) {
      expect(toExternalHttpUrl(value)).toBeUndefined();
    }
  });

  it("returns undefined for empty or non-string input", () => {
    expect(toExternalHttpUrl("")).toBeUndefined();
    expect(toExternalHttpUrl(undefined)).toBeUndefined();
    expect(toExternalHttpUrl(null)).toBeUndefined();
  });
});

describe("isAllowedLocationTarget", () => {
  it("allows web, mail and native sign-in targets", () => {
    expect(isAllowedLocationTarget("https://example.com/x")).toBe(true);
    expect(isAllowedLocationTarget("mailto:someone@example.com")).toBe(true);
    expect(isAllowedLocationTarget("nucleum://oauthsignin?code=test-code")).toBe(
      true
    );
  });

  it("refuses script schemes and other custom schemes", () => {
    expect(isAllowedLocationTarget("javascript:alert(document.domain)//http")).toBe(
      false
    );
    expect(isAllowedLocationTarget("data:text/html,x")).toBe(false);
    expect(isAllowedLocationTarget("nucleum://settings")).toBe(false);
    expect(isAllowedLocationTarget(undefined)).toBe(false);
  });
});
