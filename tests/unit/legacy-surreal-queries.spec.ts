import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  decodeLegacyStringLiteral,
  isKnownRegion,
  recordKey,
  toQueryVars,
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
// Per-statement results the stubbed database answers with, after the two USE statements.
let answer: (sent: Sent) => unknown[];

beforeEach(() => {
  sent = [];
  answer = () => [{ result: [] }, { result: [] }];
  vi.stubEnv("DOMAIN", "db-test.example");
  vi.stubEnv("ADMIN_NS", "admin");
  vi.stubEnv("USER_NS", "user");
  vi.stubEnv("ADMIN_DB_NAME", "ADMIN");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const rpc = JSON.parse(String(init?.body ?? "{}"));
      expect(rpc.method).toBe("query");
      const request = { url, body: rpc.params[0], vars: rpc.params[1] };
      sent.push(request);
      return new Response(
        JSON.stringify({
          result: [{ result: null }, { result: null }, ...answer(request)]
        }),
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

describe("toQueryVars", () => {
  it("keeps values as they are and leaves out undefined", () => {
    expect(
      toQueryVars({ email: INJECTION, n: 5, ctx: { a: [1] }, none: undefined })
    ).toEqual({ email: INJECTION, n: 5, ctx: { a: [1] } });
    expect(toQueryVars()).toEqual({});
  });

  it("refuses variable names that are not identifiers", () => {
    expect(() => toQueryVars({ "a&b": 1 })).toThrow(/Invalid query variable/);
  });
});

describe("recordKey", () => {
  it("unwraps escaped record keys", () => {
    expect(recordKey("abc123")).toBe("abc123");
    expect(recordKey("⟨test-user⟩")).toBe("test-user");
    expect(recordKey("⟨a\\⟩b⟩")).toBe("a⟩b");
    expect(recordKey("`test-user`")).toBe("test-user");
  });
});

describe("decodeLegacyStringLiteral", () => {
  it("decodes the escapes SurrealQL string literals accepted", () => {
    expect(decodeLegacyStringLiteral("plain")).toBe("plain");
    expect(decodeLegacyStringLiteral("a\\nb")).toBe("a\nb");
    expect(decodeLegacyStringLiteral("a\\\\b\\/\\t")).toBe("a\\b/\t");
    expect(decodeLegacyStringLiteral("\\u0041\\u{1F600}")).toBe("A😀");
  });

  it("returns undefined where the old literal would not have parsed", () => {
    expect(decodeLegacyStringLiteral('a"b')).toBeUndefined();
    expect(decodeLegacyStringLiteral("a\\qb")).toBeUndefined();
    expect(decodeLegacyStringLiteral("a\\")).toBeUndefined();
    expect(decodeLegacyStringLiteral("\\u12")).toBeUndefined();
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
    expect(sent[0].url.pathname).toBe("/rpc");
    expect(sent[0].url.search).toBe("");
    expect(sent[0].url.host).toBe("db.db-test.example");
    expect(sent[0].vars).toEqual({ email: INJECTION });
    expect(sent[0].body).toBe(
      "USE NAMESPACE admin; USE DATABASE ADMIN; SELECT * FROM user WHERE email = $email"
    );
  });

  const provider = () => new SurrealDatabaseProvider();

  it("binds record keys without their escaping", async () => {
    await provider().getUserAndPlan("⟨test-user⟩");
    expect(sent[0].vars).toEqual({ userId: "test-user" });
  });

  it("accepts a password stored from its escape-decoded form once and rehashes it", async () => {
    answer = ({ vars, body }) => {
      if (body.includes("UPDATE")) return [{ result: [] }];
      const matches = vars.password === "a\nb";
      return [{ result: null }, { result: matches ? [{ id: "user:abc" }] : -1 }];
    };
    const user = await provider().authenticateUser("a@example.com", "a\\nb");
    expect(user).toEqual({ id: "user:abc" });
    expect(sent.map((request) => request.vars.password)).toEqual([
      "a\\nb",
      "a\nb",
      "a\\nb"
    ]);
    expect(sent[2].body).toContain("crypto::argon2::generate($password)");
    expect(sent[2].vars.id).toBe("user:abc");
  });

  it("does not retry a wrong password that has no escapes", async () => {
    answer = () => [{ result: null }, { result: -1 }];
    expect(await provider().authenticateUser("a@example.com", "wrong")).toBe(-1);
    expect(sent).toHaveLength(1);
  });

  it("returns the RELATE result first from createSubscription", async () => {
    answer = ({ body }) =>
      body.startsWith("USE NAMESPACE admin; USE DATABASE ADMIN; select")
        ? [{ result: ["abc"] }, { result: ["memotron"] }]
        : [{ result: null }, { result: null }, { result: [{ subscribedAt: "now" }] }];
    const response = await provider().createSubscription({
      email: "a@example.com",
      app: "memotron.io",
      productId: "memotron",
      context: "landing"
    } as any);
    expect(response).toEqual([{ result: [{ subscribedAt: "now" }] }]);
  });

  it("deletes the account without a regional query when Surreal sync is off", async () => {
    vi.stubEnv("USER_NS", undefined as unknown as string);
    await provider().deleteUser({ id: "⟨test-user⟩", region: "useast" } as any);
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toContain("DELETE user WHERE meta::id(id) = $userId");
  });
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
