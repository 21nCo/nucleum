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
      lastError: { message: "boom" },
      namespace: "user-secret-namespace",
      storageDbName: "db-user-secret",
      remoteUrl: "https://account-insouth.example.app/datafn?token=abc"
    })
  };
});
vi.mock("@21n/ui/environment/view.store", async () => {
  const { writable } = await import("svelte/store");
  return { default: writable({ isPortrait: false }) };
});

import {
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
    const text = formatDiagnosticReport(
      collectDiagnosticSections("1.0 MB of 10.0 MB"),
      new Date()
    );
    expect(text).toContain("storage: 1.0 MB of 10.0 MB");
    expect(text).toContain("version: 1.2.3");
    expect(text).toContain("pendingChanges: 2");
    expect(text).toContain("lastError: boom");
    expect(text).toContain("server: https://account-insouth.example.app");
    expect(text).toContain("colorScheme: colorscheme:clean_ember_light");
    expect(text).not.toContain("user-secret");
    expect(text).not.toContain("token=abc");
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
