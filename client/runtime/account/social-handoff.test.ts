import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@nucleum/persistence/client-storage", () => ({
  clientStorage: {
    get: vi.fn(async (key: string) => storage.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
      return value;
    }),
    remove: vi.fn(async (key: string) => {
      storage.delete(key);
      return key;
    })
  }
}));

import {
  SOCIAL_HANDOFF_TTL_MS,
  beginSocialHandoff,
  deriveSocialHandoffChallenge,
  resolveSocialHandoffToken,
  takeSocialHandoffVerifier,
  type SocialHandoffExchangeClient
} from "@nucleum/client/runtime/account/social-handoff";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";

const NOW = Date.UTC(2026, 10, 21, 10, 0, 0);

function exchangeClient(
  result: Awaited<ReturnType<SocialHandoffExchangeClient["exchangeSocialHandoff"]>>
) {
  const exchangeSocialHandoff = vi.fn(async () => result);
  return {
    exchangeSocialHandoff,
    client: async () => ({ exchangeSocialHandoff })
  };
}

function storedVerifier() {
  const raw = storage.get(ClientStorageKey.AUTHFN_SOCIAL_HANDOFF);
  return raw ? (JSON.parse(raw) as { verifier: string }).verifier : undefined;
}

beforeEach(() => {
  storage.clear();
});

describe("social handoff verifier", () => {
  it("derives the base64url SHA-256 of the verifier", async () => {
    const verifier = "test-verifier-".padEnd(43, "x");

    expect(await deriveSocialHandoffChallenge(verifier)).toBe(
      createHash("sha256").update(verifier).digest("base64url")
    );
  });

  it("keeps a 43-character verifier whose challenge it returns", async () => {
    const challenge = await beginSocialHandoff(NOW);
    const verifier = storedVerifier();

    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toBe(await deriveSocialHandoffChallenge(verifier ?? ""));
  });

  it("hands the verifier out once and not after it expires", async () => {
    await beginSocialHandoff(NOW);
    const verifier = storedVerifier();

    expect(await takeSocialHandoffVerifier(NOW + 1000)).toBe(verifier);
    expect(await takeSocialHandoffVerifier(NOW + 1000)).toBeUndefined();

    await beginSocialHandoff(NOW);
    expect(
      await takeSocialHandoffVerifier(NOW + SOCIAL_HANDOFF_TTL_MS)
    ).toBeUndefined();
    expect(storage.has(ClientStorageKey.AUTHFN_SOCIAL_HANDOFF)).toBe(false);
  });
});

describe("resolveSocialHandoffToken", () => {
  it("exchanges a one-time code with the pending verifier", async () => {
    await beginSocialHandoff(NOW);
    const verifier = storedVerifier();
    const { exchangeSocialHandoff, client } = exchangeClient({
      ok: true,
      data: { handoff: { token: "test-session-token", regionId: "useast" } }
    });

    const result = await resolveSocialHandoffToken(
      { token: "test-handoff-code", handoff: "code", regionId: "insouth" },
      client,
      NOW + 1000
    );

    expect(exchangeSocialHandoff).toHaveBeenCalledWith({
      code: "test-handoff-code",
      verifier
    });
    expect(result).toEqual({
      kind: "session",
      token: "test-session-token",
      regionId: "useast"
    });
  });

  it("refuses a code when no sign-in is pending or the exchange fails", async () => {
    const missing = exchangeClient({
      ok: true,
      data: { handoff: { token: "test-session-token", regionId: null } }
    });
    expect(
      await resolveSocialHandoffToken(
        { token: "test-handoff-code", handoff: "code" },
        missing.client,
        NOW
      )
    ).toEqual({ kind: "failed", errorCode: "handoff_verifier_missing" });
    expect(missing.exchangeSocialHandoff).not.toHaveBeenCalled();

    await beginSocialHandoff(NOW);
    const refused = exchangeClient({
      ok: false,
      error: { code: "AUTHFN_VALIDATION_ERROR", message: "invalid" }
    });
    expect(
      await resolveSocialHandoffToken(
        { token: "test-handoff-code", handoff: "code" },
        refused.client,
        NOW
      )
    ).toEqual({ kind: "failed", errorCode: "AUTHFN_VALIDATION_ERROR" });
  });

  it("uses a session token as is when nothing was exchanged", async () => {
    const idle = exchangeClient({
      ok: false,
      error: { code: "AUTHFN_VALIDATION_ERROR", message: "invalid" }
    });
    expect(
      await resolveSocialHandoffToken(
        { token: "test-session-token", regionId: "insouth" },
        idle.client,
        NOW
      )
    ).toEqual({ kind: "session", token: "test-session-token", regionId: "insouth" });
    expect(idle.exchangeSocialHandoff).not.toHaveBeenCalled();

    await beginSocialHandoff(NOW);
    expect(
      await resolveSocialHandoffToken(
        { token: "test-session-token" },
        idle.client,
        NOW
      )
    ).toEqual({ kind: "session", token: "test-session-token", regionId: undefined });
    expect(idle.exchangeSocialHandoff).toHaveBeenCalledTimes(1);
  });
});
