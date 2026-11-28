import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  encodeQueryVars,
  isKnownRegion,
  performQueryOnMasterDb,
  performQueryOnRegionalDb,
  resolveDatabaseInstance
} from "../../server/surrealHelpers";
import { SurrealDatabaseProvider } from "../../server/database/providers/surreal.provider";
import { performUserAccountAction } from "../../server/common/account";
import { CONTEXT } from "../../server/common/account/account.type";

vi.mock("$lib/server/common/auth", () => ({
  authorize: vi.fn(async () => null),
  generateToken: vi.fn()
}));

const INJECTION = 'x"); DELETE user; --';

type Sent = { url: URL; body: string; vars: Record<string, unknown> };
let sent: Sent[];

beforeEach(() => {
  sent = [];
  vi.stubEnv("DOMAIN", "db-test.example");
  vi.stubEnv("ADMIN_NS", "admin");
  vi.stubEnv("USER_NS", "user");
  vi.stubEnv("ADMIN_DB_NAME", "ADMIN");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const vars = Object.fromEntries(
        [...url.searchParams].map(([name, value]) => [name, JSON.parse(value)])
      );
      sent.push({ url, body: String(init?.body ?? ""), vars });
      return new Response(
        JSON.stringify([{ result: null }, { result: null }, { result: [] }, { result: [] }]),
        { headers: { "Content-Type": "application/json" } }
      );
    })
  );
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("encodeQueryVars", () => {
  it("sends every value as JSON and leaves out undefined", () => {
    const query = new URLSearchParams(
      encodeQueryVars({ email: INJECTION, n: 5, ctx: { a: [1] }, none: undefined }).slice(1)
    );
    expect(Object.fromEntries(query)).toEqual({
      email: JSON.stringify(INJECTION),
      n: "5",
      ctx: '{"a":[1]}'
    });
    expect(encodeQueryVars()).toBe("");
  });

  it("refuses variable names that are not identifiers", () => {
    expect(() => encodeQueryVars({ "a&b": 1 })).toThrow(/Invalid query variable/);
  });
});

describe("database host by region", () => {
  it("allows only deployment/regions.json codes and global", () => {
    expect(resolveDatabaseInstance(undefined)).toBe("db.db-test.example");
    expect(resolveDatabaseInstance("")).toBe("db.db-test.example");
    expect(resolveDatabaseInstance("global")).toBe("db.db-test.example");
    expect(resolveDatabaseInstance("useast")).toBe("useast.db.db-test.example");
    expect(isKnownRegion("insouth")).toBe(true);
  });

  it.each(["evil.example/?", "useast.evil.example#", "constructor", "__proto__", "USEAST"])(
    "refuses %s",
    (region) => {
      expect(isKnownRegion(region)).toBe(false);
      expect(() => resolveDatabaseInstance(region)).toThrow(/Unknown region/);
    }
  );

  it("never sends credentials to a host named by the caller", async () => {
    await expect(
      performQueryOnRegionalDb("RETURN 1", { region: "evil.example/?", db: "abc" })
    ).rejects.toThrow(/Unknown region/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a database name that is not an identifier", async () => {
    await expect(
      performQueryOnRegionalDb("RETURN 1", {
        region: "useast",
        db: "abc; REMOVE NAMESPACE user",
        context: CONTEXT.USER
      })
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a bootstrap region outside the allowlist before anything else runs", async () => {
    await expect(
      performUserAccountAction("Bearer test-token", {
        action: "bootstrap",
        region: "evil.example/?",
        context: { host: "web.memotron.app" }
      })
    ).rejects.toThrow(/Unknown region/);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("bound queries", () => {
  it("sends variables in the URL and keeps them out of the query text", async () => {
    await performQueryOnMasterDb("SELECT * FROM user WHERE email = $email", {
      email: INJECTION
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].url.pathname).toBe("/sql");
    expect(sent[0].url.host).toBe("db.db-test.example");
    expect(sent[0].vars).toEqual({ email: INJECTION });
    expect(sent[0].body).toBe(
      "USE NAMESPACE admin; USE DATABASE ADMIN; SELECT * FROM user WHERE email = $email"
    );
  });

  const provider = () => new SurrealDatabaseProvider();
  const cases: [string, () => Promise<unknown>][] = [
    ["authenticateUser", () => provider().authenticateUser(INJECTION, INJECTION)],
    ["getUserByEmail", () => provider().getUserByEmail(INJECTION)],
    ["getUserById", () => provider().getUserById(INJECTION)],
    ["checkBetaList", () => provider().checkBetaList(INJECTION, INJECTION)],
    ["getProductConfig", () => provider().getProductConfig(INJECTION)],
    [
      "createGuest",
      () =>
        provider().createGuest({
          id: INJECTION,
          timestamp: "2026-01-01T00:00:00.000Z",
          context: { note: INJECTION }
        } as any)
    ],
    [
      "createUserIfNotExists",
      () =>
        provider().createUserIfNotExists({
          email: INJECTION,
          password: INJECTION,
          nickName: INJECTION,
          profilePictureUrl: INJECTION,
          guestId: INJECTION,
          context: { note: INJECTION },
          emailParts: { name: INJECTION },
          joinDate: "2026-01-01T00:00:00.000Z",
          oAuthId: INJECTION,
          isOAuth: true
        } as any)
    ],
    ["log", () => provider().log(INJECTION, { activity: INJECTION } as any)],
    ["getUserAndPlan", () => provider().getUserAndPlan(INJECTION)],
    ["createSpace", () => provider().createSpace(INJECTION, INJECTION)],
    ["getDbDefinitions", () => provider().getDbDefinitions(INJECTION, 3)]
  ];

  it.each(cases)("%s binds caller values", async (_name, run) => {
    await run().catch(() => undefined);
    expect(sent.length).toBeGreaterThan(0);
    for (const request of sent) {
      expect(request.body).not.toContain("DELETE user");
      expect(request.body).not.toContain(INJECTION);
    }
    // getDbDefinitions lowercases the app name, so compare case-insensitively.
    expect(
      JSON.stringify(sent.map((request) => request.vars)).toLowerCase()
    ).toContain(JSON.stringify(INJECTION).slice(1, -1).toLowerCase());
  });
});
