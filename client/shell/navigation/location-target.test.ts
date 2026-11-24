import { describe, expect, it } from "vitest";

import {
  isAllowedLocationTarget,
  resolveLocationTarget
} from "@nucleum/shell/navigation/link-target";

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
    expect(
      isAllowedLocationTarget("javascript://oauthsignin/%0aalert(1)")
    ).toBe(false);
    expect(isAllowedLocationTarget("evilapp://oauthsignin?token=x")).toBe(false);
    expect(isAllowedLocationTarget(undefined)).toBe(false);
  });
});

describe("resolveLocationTarget", () => {
  const current = "https://web.nucleum.app/library";

  it("keeps same-origin paths whose query contains a URL", () => {
    expect(
      resolveLocationTarget("/library?returnTo=https%3A%2F%2Fexample.com", current)
    ).toBe("https://web.nucleum.app/library?returnTo=https%3A%2F%2Fexample.com");
  });

  it("keeps relative paths in the bundled native app", () => {
    expect(
      resolveLocationTarget(
        "/index.html?returnTo=https%3A%2F%2Fexample.com",
        "tauri://localhost/library"
      )
    ).toBe("tauri://localhost/index.html?returnTo=https%3A%2F%2Fexample.com");
    expect(
      resolveLocationTarget("javascript:alert(1)//http", "tauri://localhost/x")
    ).toBeUndefined();
  });

  it("allows external web, mail and native sign-in targets", () => {
    expect(resolveLocationTarget("https://example.com/a", current)).toBe(
      "https://example.com/a"
    );
    expect(resolveLocationTarget("mailto:someone@example.com", current)).toBe(
      "mailto:someone@example.com"
    );
    expect(
      resolveLocationTarget("nucleum://oauthsignin?token=test-token", current)
    ).toBe("nucleum://oauthsignin?token=test-token");
  });

  it("refuses script URLs, including ones that contain http or oauthsignin", () => {
    expect(
      resolveLocationTarget("javascript:alert(document.domain)//http", current)
    ).toBeUndefined();
    expect(
      resolveLocationTarget("javascript://oauthsignin/%0aalert(1)", current)
    ).toBeUndefined();
  });
});
