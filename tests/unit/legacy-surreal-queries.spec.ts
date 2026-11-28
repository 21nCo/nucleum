import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  decodeLegacyStringLiteral,
  isKnownRegion,
  toQueryVars,
  userRecord,
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

describe("userRecord", () => {
  it("keeps the serialized key so type::record resolves the same record", () => {
    expect(userRecord("abc123")).toBe("user:abc123");
    expect(userRecord("⟨test-user⟩")).toBe("user:⟨test-user⟩");
    expect(userRecord("123")).toBe("user:123");
  });
});

describe("decodeLegacyStringLiteral", () => {
  it("decodes the escapes SurrealQL string literals accepted", () => {
    expect(decodeLegacyStringLiteral("plain")).toBe("plain");
    expect(decodeLegacyStringLiteral("a\\nb")).toBe("a\nb");
    expect(decodeLegacyStringLiteral("a\\\\b\\/\\t")).toBe("a\\b/\t");
    expect(decodeLegacyStringLiteral("\\u0041\\u{1F600}")).toBe("A😀");
  });

  it("matches SurrealDB 2.3.3 for empty braced escapes and surrogate pairs", () => {
    expect(decodeLegacyStringLiteral("a\\u{}b")).toBe("a\u0000b");
    expect(decodeLegacyStringLiteral("\\uD83D\\uDE00")).toBe("😀");
    expect(decodeLegacyStringLiteral("\\uD83Dx")).toBeUndefined();
    expect(decodeLegacyStringLiteral("\\uDE00")).toBeUndefined();
    expect(decodeLegacyStringLiteral("\\u{D83D}")).toBeUndefined();
    expect(decodeLegacyStringLiteral("\\u{110000}")).toBeUndefined();
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

  it("bootstraps an account that names no region into the global database", async () => {
    await performUserAccountAction("Bearer test-token", {
      action: "bootstrap",
      context: { host: "web.memotron.app" }
    }).catch(() => undefined);
    const { authorize } = await import("$lib/server/common/auth");
    expect(authorize).toHaveBeenCalled();
  });

  it.each([false, 0, null])("refuses a bootstrap region of %s", async (region) => {
    await expect(
      performUserAccountAction("Bearer test-token", {
        action: "bootstrap",
        region,
        context: { host: "web.memotron.app" }
      })
    ).rejects.toThrow(/Unknown region/);
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

  it("binds the serialized user record for type::record", async () => {
    await provider().getUserAndPlan("⟨test-user⟩");
    expect(sent[0].vars).toEqual({ user: "user:⟨test-user⟩" });
    expect(sent[0].body).toContain("type::record($user)");
  });

  it("accepts a legacy hash of the escape-decoded password once, rehashing it in the same statement", async () => {
    answer = ({ body }) =>
      body.includes("passVersion IS NONE")
        ? [{ result: null }, { result: [{ id: "user:abc", passVersion: 2 }] }]
        : [{ result: null }, { result: -1 }];
    const user = await provider().authenticateUser("a@example.com", "a\\nb");
    expect(user).toEqual({ id: "user:abc", passVersion: 2 });
    expect(sent).toHaveLength(2);
    expect(sent[0].vars).toEqual({ email: "a@example.com", password: "a\\nb" });
    expect(sent[1].vars).toEqual({
      email: "a@example.com",
      legacy: "a\nb",
      password: "a\\nb"
    });
    expect(sent[1].body).toContain("AND passVersion IS NONE");
    expect(sent[1].body).toContain(
      "SET pass = crypto::argon2::generate($password), passhash = crypto::md5($password), passVersion = 2 WHERE passVersion IS NONE"
    );
  });

  it("checks the password as typed again when a concurrent sign-in migrated the hash first", async () => {
    let literalChecks = 0;
    answer = ({ body, vars }) => {
      if (body.includes("passVersion IS NONE;")) return [{ result: null }, { result: -1 }];
      if (vars.password === "a\\nb" && !body.includes("UPDATE")) {
        literalChecks++;
        return [
          { result: null },
          { result: literalChecks === 1 ? -1 : [{ id: "user:abc", passVersion: 2 }] }
        ];
      }
      return [{ result: [] }];
    };
    expect(await provider().authenticateUser("a@example.com", "a\\nb")).toEqual({
      id: "user:abc",
      passVersion: 2
    });
    expect(literalChecks).toBe(2);
  });

  it("marks a legacy account as version 2 when its literal password matches", async () => {
    answer = ({ body }) =>
      body.includes("UPDATE")
        ? [{ result: [] }]
        : [{ result: null }, { result: [{ id: "user:abc" }] }];
    expect(await provider().authenticateUser("a@example.com", "a\\nb")).toEqual({
      id: "user:abc"
    });
    expect(sent).toHaveLength(2);
    expect(sent[1].body).toContain("SET passVersion = 2 WHERE passVersion IS NONE");
    expect(sent[1].vars).toEqual({ id: "user:abc" });
  });

  it("stores new password hashes as version 2", async () => {
    await provider().createUserIfNotExists({
      email: "a@example.com",
      password: "test-password",
      guestId: "abc",
      isOAuth: false,
      context: {}
    } as any);
    expect(sent[0].body).toContain("passVersion = 2");
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
    expect(
      JSON.stringify(sent.map((request) => request.vars)).toLowerCase()
    ).toContain(JSON.stringify(INJECTION).slice(1, -1).toLowerCase());
  });
});
