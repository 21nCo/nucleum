import { describe, expect, it, vi } from "vitest";

vi.mock("@nucleum/shared-state/app-context/app.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    appStore: writable({
      product: "nucleum",
      env: "dev",
      version: "1.2.3",
      build: 7
    })
  };
});
vi.mock("@nucleum/shared-state/appearance/appearance.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    default: writable({
      colorScheme: { id: "colorscheme:clean_ember_light", isDark: false },
      appStyle: "rounded"
    })
  };
});
vi.mock("@nucleum/client/runtime/context.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    default: writable({
      os: "macos",
      embed: "none",
      isEmbed: false,
      isTouchDevice: false
    })
  };
});
vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    nucleumDatafnStatus: writable({
      status: "idle",
      mode: "sync",
      nucleumMode: "sync",
      phase: null,
      online: true,
      pendingChanges: 2,
      lastSyncAt: 0,
      lastError: {
        message:
          'Failed to open IndexedDB "nucleum-datafn-dev-nucleum_user_01JSECRETID" for user:01JSECRETID: boom'
      },
      namespace: "user:01JSECRETID",
      storageDbName: "nucleum-datafn-dev-nucleum_user_01JSECRETID",
      remoteUrl: "https://account-insouth.example.app/datafn?token=abc"
    })
  };
});
vi.mock("@21n/ui/environment/view.store", async () => {
  const { writable } = await import("svelte/store");
  return { default: writable({ isPortrait: false }) };
});

import {
  buildDiagnosticReport,
  collectDiagnosticIdentifiers,
  collectDiagnosticSections,
  formatDiagnosticReport,
  resolveOrigin,
  sanitizeDiagnosticText
} from "./diagnostic-report";

describe("formatDiagnosticReport", () => {
  it("prints sections, placeholders and shortened values", () => {
    const text = formatDiagnosticReport(
      [
        {
          title: "App",
          fields: { version: "1.0", build: undefined, note: "x".repeat(400) }
        }
      ],
      new Date("2026-11-12T00:00:00.000Z")
    );
    expect(text).toContain("Diagnostic information (2026-11-12T00:00:00.000Z)");
    expect(text).toContain("## App");
    expect(text).toContain("version: 1.0");
    expect(text).toContain("build: -");
    expect(text).toContain(`note: ${"x".repeat(300)}...`);
  });
});

describe("resolveOrigin", () => {
  it("keeps only the origin", () => {
    expect(resolveOrigin("https://a.example.app/datafn?token=abc")).toBe(
      "https://a.example.app"
    );
    expect(resolveOrigin("not a url")).toBeUndefined();
    expect(resolveOrigin(null)).toBeUndefined();
  });
});

describe("collectDiagnosticSections", () => {
  it("collects app, sync and appearance details without identifiers", () => {
    const text = buildDiagnosticReport("1.0 MB of 10.0 MB", new Date());
    expect(text).toContain("storage: 1.0 MB of 10.0 MB");
    expect(text).toContain("version: 1.2.3");
    expect(text).toContain("pendingChanges: 2");
    expect(text).toContain(
      'lastError: Failed to open IndexedDB "[redacted]" for [redacted]: boom'
    );
    expect(text).toContain("server: https://account-insouth.example.app");
    expect(text).toContain("colorScheme: colorscheme:clean_ember_light");
    expect(text).not.toContain("01JSECRETID");
    expect(text).not.toContain("nucleum-datafn-");
    expect(text).not.toContain("token=abc");
  });

  it("redacts the runtime namespace and database names in every form", () => {
    expect(collectDiagnosticIdentifiers()).toEqual([
      "nucleum-datafn-dev-nucleum_user_01JSECRETID",
      "user:01JSECRETID",
      "user_01JSECRETID",
      "01JSECRETID"
    ]);
    const text = formatDiagnosticReport(
      collectDiagnosticSections(undefined),
      new Date(),
      ["ns-custom-value"]
    );
    expect(text).toContain("for user:[redacted]: boom");
    expect(
      sanitizeDiagnosticText("open ns-custom-value-search failed", [
        "ns-custom-value"
      ])
    ).toBe("open [redacted]-search failed");
  });
});

describe("sanitizeDiagnosticText", () => {
  it("reduces URLs to their origin and removes identity and secrets", () => {
    const text = sanitizeDiagnosticText(
      "Fetch https://a.example.app/datafn/sync?token=abc failed for jane@example.com " +
        "with Bearer s3cr3t and eyJhbGciOi.eyJzdWIiOi.c2lnbmF0dXJl, retry access_token=xyz"
    );
    expect(text).toBe(
      "Fetch https://a.example.app failed for [email] " +
        "with Bearer [redacted] and [redacted], retry access_token=[redacted]"
    );
  });

  it.each([
    ["token: dummy-secret", "token: [redacted]"],
    ["Token : dummy-secret", "Token : [redacted]"],
    [
      '{"access_token": "a b","refresh_token":"c"}',
      '{"access_token": "[redacted]","refresh_token":"[redacted]"}'
    ],
    [
      "accessToken=abc123 refreshToken=def",
      "accessToken=[redacted] refreshToken=[redacted]"
    ],
    [
      "apiKey: k-123, clientSecret='s 1'",
      "apiKey: [redacted], clientSecret='[redacted]'"
    ],
    ["password=hunter2&next=1", "password=[redacted]&next=1"],
    [
      "Authorization: Basic dXNlcjpwYXNz",
      "Authorization: [redacted] [redacted]"
    ],
    ["{'sessionId': 'abc'}", "{'sessionId': '[redacted]'}"]
  ])("redacts secret values in %s", (input, expected) => {
    expect(sanitizeDiagnosticText(input)).toBe(expected);
  });

  it("redacts namespaces and DataFn database names it was not given", () => {
    expect(
      sanitizeDiagnosticText(
        'Failed to open IndexedDB "nucleum-datafn-prod-nucleum_guest_dap-123456" (guest:dap-123456)'
      )
    ).toBe('Failed to open IndexedDB "[database]" (guest:[redacted])');
    expect(sanitizeDiagnosticText("status: idle, user: none")).toBe(
      "status: idle, user: none"
    );
  });

  it("applies to every value in the formatted report", () => {
    const text = formatDiagnosticReport(
      [
        {
          title: "Sync",
          fields: {
            lastError: "POST https://a.example.app/x/y?key=1 for a@b.co"
          }
        }
      ],
      new Date("2026-11-12T00:00:00.000Z")
    );
    expect(text).toContain("lastError: POST https://a.example.app for [email]");
    expect(text).not.toContain("/x/y");
    expect(text).not.toContain("a@b.co");
  });
});
