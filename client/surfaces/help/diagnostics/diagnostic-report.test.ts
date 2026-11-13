import { describe, expect, it, vi } from "vitest";

vi.mock("@nucleum/shared-state/app-context/app.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    appStore: writable({
      product: "nucleum",
      env: "dev",
      version: "1.2.3",
      build: 7,
      actions: [
        { action: "notes", path: "notes", isSubPathOpen: true },
        { action: "settings" }
      ]
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
  DIAGNOSTIC_ERROR_SUMMARIES,
  MAX_SANITIZED_LENGTH,
  buildDiagnosticReport,
  collectDiagnosticIdentifiers,
  formatDiagnosticReport,
  resolveOrigin,
  sanitizeDiagnosticText,
  summarizeDiagnosticError,
  summarizeDiagnosticPath
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
    expect(text).toContain("lastError: storage error");
    expect(text).not.toContain("boom");
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
      [{ title: "Sync", fields: { note: "for user:01JSECRETID: boom" } }],
      new Date(),
      collectDiagnosticIdentifiers()
    );
    expect(text).toContain("note: for [redacted]: boom");
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

  it.each([
    ["a@b@c.example", "a@[email]"],
    ["x.y+z@mail.example.org, then q@r.io", "[email], then [email]"],
    ["@handle and a@nodot", "@handle and a@nodot"]
  ])("redacts email addresses in %s", (input, expected) => {
    expect(sanitizeDiagnosticText(input)).toBe(expected);
  });

  const adversarialInputs: [string, string][] = [
    ["an address-like run", "a".repeat(16_000)],
    ["a run of dashed words", "a-".repeat(8_000)],
    ["a run of dotted words", "a.".repeat(8_000)],
    ["a run of JWT prefixes", "eyJ-".repeat(4_000)],
    ["a run of at signs", "a@".repeat(8_000)]
  ];

  it.each(adversarialInputs)(
    "stays bounded on 16k characters of %s",
    (_label, input) => {
      const startedAt = performance.now();
      const text = sanitizeDiagnosticText(input);
      expect(performance.now() - startedAt).toBeLessThan(250);
      expect(text.length).toBeLessThanOrEqual(MAX_SANITIZED_LENGTH + 3);
    }
  );

  it("drops long text at a word boundary so no partial secret remains", () => {
    const filler = "word ".repeat((MAX_SANITIZED_LENGTH - 10) / 5);
    const text = sanitizeDiagnosticText(
      `${filler}jane.doe@example.com token=abcdef`
    );
    expect(text).toBe(`${filler.trimEnd()}...`);
    expect(text).not.toContain("jane");
    expect(sanitizeDiagnosticText("x".repeat(20_000))).toBe("...");
  });

  it("redacts a quoted secret value cut off before its closing quote", () => {
    expect(sanitizeDiagnosticText('{"apiKey": "cut-off-val')).toBe(
      '{"apiKey": "[redacted]"'
    );
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

/** Reviewer probes from local review rounds 2 and 3, with their private parts. */
const errorProbes: [string, string[]][] = [
  ['Validation failed for note "Private journal entry"', ["Private journal"]],
  ["otp: 123456, userId: 01JOTHERACCOUNTID", ["123456", "01JOTHERACCOUNTID"]],
  [
    "Cookie: session=first-secret; device=second-secret",
    ["first-secret", "second-secret"]
  ],
  ['{"password": "\\"remaining-secret"}', ["remaining-secret"]],
  ["token: dummy-secret", ["dummy-secret"]],
  ['{"access_token": "a b","refresh_token":"c"}', ['"a b"']],
  ["accessToken=abc123 refreshToken=def", ["abc123"]],
  ['Failed to open IndexedDB "nucleum-ns_user_01JSECRETID"', ["01JSECRETID"]],
  [
    "Fetch https://a.example.app/datafn/sync?token=abc failed for jane@example.com",
    ["/datafn/sync", "token=abc", "jane@example.com"]
  ]
];

describe("summarizeDiagnosticError", () => {
  it.each(errorProbes)(
    "never echoes %s into the report",
    (message, secrets) => {
      const text = formatDiagnosticReport(
        [
          {
            title: "Sync",
            fields: { lastError: summarizeDiagnosticError(message) }
          }
        ],
        new Date("2026-11-12T00:00:00.000Z")
      );
      const line = text.split("\n").find((x) => x.startsWith("lastError: "));
      expect(DIAGNOSTIC_ERROR_SUMMARIES).toContain(
        line?.slice("lastError: ".length)
      );
      for (const secret of secrets) expect(text).not.toContain(secret);
    }
  );

  it("classifies common sync failures", () => {
    expect(summarizeDiagnosticError(null)).toBe("none");
    expect(summarizeDiagnosticError("")).toBe("none");
    expect(summarizeDiagnosticError("Failed to fetch")).toBe("network error");
    expect(summarizeDiagnosticError({ message: "401 Unauthorized" })).toBe(
      "auth error"
    );
    expect(summarizeDiagnosticError("QuotaExceededError")).toBe(
      "storage error"
    );
    expect(summarizeDiagnosticError("Revision conflict")).toBe(
      "conflict error"
    );
    expect(summarizeDiagnosticError("Mutation rejected")).toBe(
      "validation error"
    );
    expect(summarizeDiagnosticError("Something odd happened")).toBe(
      "unknown error"
    );
  });

  it("maps arbitrary input into the finite set", () => {
    let seed = 7;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31);
    for (let index = 0; index < 500; index++) {
      const length = next() % 80;
      const message = Array.from({ length }, () =>
        String.fromCharCode(32 + (next() % 95))
      ).join("");
      expect(DIAGNOSTIC_ERROR_SUMMARIES).toContain(
        summarizeDiagnosticError(message)
      );
    }
    for (const value of [42, {}, { message: 5 }, ["x"], true]) {
      expect(DIAGNOSTIC_ERROR_SUMMARIES).toContain(
        summarizeDiagnosticError(value)
      );
    }
  });
});

describe("summarizeDiagnosticPath", () => {
  const actions = [
    { action: "notes", path: "notes", isSubPathOpen: true },
    { action: "settings" }
  ] as never;

  it("keeps only the code-owned page route", () => {
    expect(summarizeDiagnosticPath("/notes", actions)).toBe("/notes");
    expect(
      summarizeDiagnosticPath("/notes/private-journal-01JX/", actions)
    ).toBe("/notes/...");
    expect(summarizeDiagnosticPath("/settings", actions)).toBe("/settings");
    expect(summarizeDiagnosticPath("/", actions)).toBe("/");
    expect(summarizeDiagnosticPath(undefined, actions)).toBeUndefined();
  });

  it("trims slashes in bounded time on 16k characters", () => {
    for (const input of [
      `/${"/".repeat(16_000)}a`,
      `a${"/".repeat(16_000)}a`,
      "/".repeat(16_000)
    ]) {
      const startedAt = performance.now();
      summarizeDiagnosticPath(input, actions);
      expect(performance.now() - startedAt).toBeLessThan(250);
    }
    expect(summarizeDiagnosticPath("///settings///", actions)).toBe(
      "/settings"
    );
    expect(summarizeDiagnosticPath("/".repeat(16_000), actions)).toBe("/");
  });

  it("does not echo paths that match no page", () => {
    expect(summarizeDiagnosticPath("/my-private-space/x", actions)).toBe(
      "[unrecognized route]"
    );
    expect(summarizeDiagnosticPath("/settings/secret", undefined)).toBe(
      "[unrecognized route]"
    );
  });
});
