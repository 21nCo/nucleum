import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createApiKey: vi.fn(),
  listApiKeys: vi.fn(),
  revokeApiKey: vi.fn(),
  authClient: vi.fn(),
  isBearer: vi.fn(() => false)
}));

vi.mock("@nucleum/client/runtime/account/auth", () => ({
  authClient: mocks.authClient,
  shouldUseAuthFnBearerSession: mocks.isBearer
}));

import {
  createAccessToken,
  describeAccessTokenScopes,
  listAccessTokens,
  resolveAccessTokenScopes,
  revokeAccessToken
} from "@nucleum/client/runtime/account/access-tokens";

const ok = <T>(data: T) => ({ ok: true as const, data, requestId: "r" });
const fail = (code: string, message = "nope") => ({
  ok: false as const,
  error: { code, message, retryable: false },
  requestId: "r"
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isBearer.mockReturnValue(false);
  mocks.authClient.mockResolvedValue({
    createApiKey: mocks.createApiKey,
    listApiKeys: mocks.listApiKeys,
    revokeApiKey: mocks.revokeApiKey
  });
});

describe("resolveAccessTokenScopes", () => {
  it("grants only the chosen app, adding write for read-write", () => {
    expect(resolveAccessTokenScopes("memotron", "read")).toEqual([
      "memotron:read"
    ]);
    expect(resolveAccessTokenScopes("pointron", "read-write")).toEqual([
      "pointron:read",
      "pointron:write"
    ]);
  });

  it("does not describe scopes the section never creates as one app", () => {
    expect(describeAccessTokenScopes(["*"])).toEqual({
      app: null,
      access: null
    });
    expect(describeAccessTokenScopes(["memotron:write"])).toEqual({
      app: null,
      access: null
    });
    expect(
      describeAccessTokenScopes(["memotron:read", "pointron:read"])
    ).toEqual({ app: null, access: null });
    expect(
      describeAccessTokenScopes(["nucleum:write", "nucleum:read"])
    ).toEqual({ app: "nucleum", access: "read-write" });
  });
});

describe("createAccessToken", () => {
  it("creates a token for one app with its scopes and expiry and returns the secret", async () => {
    mocks.createApiKey.mockResolvedValue(
      ok({ keyId: "key_1", secret: "ak_secret", secretReturnedOnce: true })
    );
    const now = new Date("2026-11-14T10:00:00.000Z");

    const result = await createAccessToken(
      {
        name: "  CLI laptop ",
        app: "pointron",
        access: "read-write",
        expiresInDays: 30
      },
      now
    );

    expect(mocks.createApiKey).toHaveBeenCalledWith({
      name: "CLI laptop",
      scopes: ["pointron:read", "pointron:write"],
      expiresAt: "2026-12-14T10:00:00.000Z"
    });
    expect(result).toEqual({
      ok: true,
      data: { id: "key_1", secret: "ak_secret" }
    });
  });

  it("rejects a blank name, an unknown app or an unoffered expiry without calling the service", async () => {
    const base = {
      name: "ok",
      app: "memotron" as const,
      access: "read" as const,
      expiresInDays: 7 as const
    };
    const blank = await createAccessToken({ ...base, name: "   " });
    const app = await createAccessToken({
      ...base,
      app: "timear" as unknown as "memotron"
    });
    const expiry = await createAccessToken({
      ...base,
      expiresInDays: 0 as unknown as 7
    });
    const long = await createAccessToken({ ...base, name: "x".repeat(129) });

    for (const result of [blank, app, expiry, long]) {
      expect(result).toMatchObject({ ok: false, kind: "invalid" });
    }
    expect(mocks.createApiKey).not.toHaveBeenCalled();
  });

  it("maps an expired web session to a sign-in message", async () => {
    mocks.createApiKey.mockResolvedValue(fail("AUTHFN_CSRF_INVALID"));

    const result = await createAccessToken({
      name: "x",
      app: "memotron",
      access: "read",
      expiresInDays: 7
    });

    expect(result).toEqual({
      ok: false,
      kind: "session",
      message: "Sign in again to manage access tokens."
    });
  });
});

describe("listAccessTokens", () => {
  it("hides revoked tokens and lists the rest newest first with last use", async () => {
    mocks.listApiKeys.mockResolvedValue(
      ok({
        keys: [
          {
            id: "key_old",
            name: "Old",
            scopes: ["memotron:read"],
            createdAt: "2026-10-01T00:00:00.000Z",
            expiresAt: "2026-12-01T00:00:00.000Z",
            lastUsedAt: "2026-11-10T08:00:00.000Z",
            revokedAt: null
          },
          {
            id: "key_revoked",
            name: "Revoked",
            scopes: ["memotron:read"],
            createdAt: "2026-11-01T00:00:00.000Z",
            revokedAt: "2026-11-02T00:00:00.000Z"
          },
          {
            id: "key_new",
            name: null,
            scopes: ["*"],
            createdAt: "2026-11-12T00:00:00.000Z",
            expiresAt: null,
            lastUsedAt: null
          }
        ]
      })
    );

    const result = await listAccessTokens();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map((token) => token.id)).toEqual([
      "key_new",
      "key_old"
    ]);
    expect(result.data[0]).toMatchObject({
      name: "key_new",
      app: null,
      access: null,
      lastUsedAt: null,
      expiresAt: null
    });
    expect(result.data[1]).toMatchObject({
      name: "Old",
      app: "memotron",
      access: "read",
      lastUsedAt: new Date("2026-11-10T08:00:00.000Z")
    });
  });

  it("does not call the cookie-only token routes from a bearer session", async () => {
    mocks.isBearer.mockReturnValue(true);

    const result = await listAccessTokens();

    expect(result).toMatchObject({ ok: false, kind: "unsupported" });
    expect(mocks.authClient).not.toHaveBeenCalled();
  });

  it("reports a network failure instead of throwing", async () => {
    mocks.listApiKeys.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await listAccessTokens();

    expect(result).toMatchObject({ ok: false, kind: "failed" });
  });
});

describe("revokeAccessToken", () => {
  it("revokes the token by id", async () => {
    mocks.revokeApiKey.mockResolvedValue(
      ok({ revoked: true, keyId: "key_1" })
    );

    const result = await revokeAccessToken("key_1");

    expect(mocks.revokeApiKey).toHaveBeenCalledWith({ keyId: "key_1" });
    expect(result).toEqual({ ok: true, data: { id: "key_1" } });
  });

  it("surfaces a service error", async () => {
    mocks.revokeApiKey.mockResolvedValue(
      fail("AUTHFN_NOT_FOUND", "API key not found")
    );

    const result = await revokeAccessToken("key_missing");

    expect(result).toEqual({
      ok: false,
      kind: "failed",
      message: "API key not found"
    });
  });
});
