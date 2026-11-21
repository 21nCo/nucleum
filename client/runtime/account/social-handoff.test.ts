import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SOCIAL_HANDOFF_TTL_MS,
  beginSocialHandoff,
  deriveSocialHandoffChallenge,
  finishSocialHandoff,
  resolveSocialHandoffToken,
  takeSocialHandoffVerifier,
  type SocialHandoffExchangeClient
} from "@nucleum/client/runtime/account/social-handoff";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";

const NOW = Date.UTC(2026, 10, 21, 10, 0, 0);

type ExchangeResult = Awaited<
  ReturnType<NonNullable<SocialHandoffExchangeClient["exchangeSocialHandoff"]>>
>;

function exchangeClient(result: ExchangeResult | Error) {
  const exchangeSocialHandoff = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  return {
    exchangeSocialHandoff,
    client: async () =>
      ({ exchangeSocialHandoff }) as unknown as SocialHandoffExchangeClient
  };
}

function exchanged(token: string, regionId: string | null): ExchangeResult {
  return {
    ok: true,
    data: { handoff: { token, regionId } }
  } as unknown as ExchangeResult;
}

function storedVerifier() {
  const raw = window.sessionStorage.getItem(ClientStorageKey.AUTHFN_SOCIAL_HANDOFF);
  return raw ? (JSON.parse(raw) as { verifier: string }).verifier : undefined;
}

beforeEach(() => {
  window.sessionStorage.clear();
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
    expect(window.sessionStorage.getItem(ClientStorageKey.AUTHFN_SOCIAL_HANDOFF)).toBeNull();
  });

  it("reuses a live verifier with a renewed deadline when a sign-in is retried", async () => {
    const first = await beginSocialHandoff(NOW);
    const retry = await beginSocialHandoff(NOW + SOCIAL_HANDOFF_TTL_MS - 1000);

    expect(retry).toBe(first);
    expect(
      await takeSocialHandoffVerifier(NOW + SOCIAL_HANDOFF_TTL_MS + 1000)
    ).toBeDefined();
    expect(await beginSocialHandoff(NOW + SOCIAL_HANDOFF_TTL_MS + 2000)).not.toBe(first);
  });

  it("gives simultaneous starts the same verifier", async () => {
    const [first, second] = await Promise.all([
      beginSocialHandoff(NOW),
      beginSocialHandoff(NOW)
    ]);

    expect(second).toBe(first);
  });
});

describe("resolveSocialHandoffToken", () => {
  it("exchanges a one-time code with the pending verifier", async () => {
    await beginSocialHandoff(NOW);
    const verifier = storedVerifier();
    const { exchangeSocialHandoff, client } = exchangeClient(
      exchanged("test-session-token", "useast")
    );

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
      regionId: "useast",
      verifier
    });
    expect(storedVerifier()).toBe(verifier);
    finishSocialHandoff(verifier ?? "");
    expect(storedVerifier()).toBeUndefined();
  });

  it("recognizes a code from a shell that does not forward the handoff kind", async () => {
    await beginSocialHandoff(NOW);
    const { exchangeSocialHandoff, client } = exchangeClient(
      exchanged("test-session-token", null)
    );

    const result = await resolveSocialHandoffToken(
      { token: "shc_test-handoff-code", regionId: "insouth" },
      client,
      NOW
    );

    expect(exchangeSocialHandoff).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      kind: "session",
      token: "test-session-token",
      regionId: "insouth"
    });
  });

  it("leaves a code to the window that started the sign-in", async () => {
    const elsewhere = exchangeClient(exchanged("test-session-token", null));
    expect(
      await resolveSocialHandoffToken(
        { token: "shc_test-handoff-code" },
        elsewhere.client,
        NOW
      )
    ).toEqual({ kind: "ignored" });
    expect(elsewhere.exchangeSocialHandoff).not.toHaveBeenCalled();
  });

  it("keeps its verifier when another window's code arrives", async () => {
    await beginSocialHandoff(NOW);
    const verifier = storedVerifier();
    const other = exchangeClient({
      ok: false,
      error: { code: "AUTHFN_OAUTH_STATE_INVALID", message: "mismatch" }
    } as unknown as ExchangeResult);

    expect(
      await resolveSocialHandoffToken(
        { token: "shc_test-other-window-code" },
        other.client,
        NOW
      )
    ).toEqual({ kind: "ignored" });
    expect(storedVerifier()).toBe(verifier);
  });

  it("treats an expired sign-in as none, so a broadcast code shows no error", async () => {
    await beginSocialHandoff(NOW);
    const expired = exchangeClient(exchanged("test-session-token", null));
    expect(
      await resolveSocialHandoffToken(
        { token: "shc_test-handoff-code" },
        expired.client,
        NOW + SOCIAL_HANDOFF_TTL_MS
      )
    ).toEqual({ kind: "ignored" });
    expect(expired.exchangeSocialHandoff).not.toHaveBeenCalled();
  });

  it("keeps the verifier available while another window's code is being checked", async () => {
    await beginSocialHandoff(NOW);
    let answerOther: (value: ExchangeResult) => void = () => {};
    const exchangeSocialHandoff = vi.fn(
      ({ code }: { code: string; verifier: string }) =>
        code === "shc_test-other-window-code"
          ? new Promise<ExchangeResult>((resolve) => {
              answerOther = resolve;
            })
          : Promise.resolve(exchanged("test-session-token", null))
    );
    const client = async () =>
      ({ exchangeSocialHandoff }) as unknown as SocialHandoffExchangeClient;

    const other = resolveSocialHandoffToken(
      { token: "shc_test-other-window-code" },
      client,
      NOW
    );
    const own = await resolveSocialHandoffToken(
      { token: "shc_test-own-code" },
      client,
      NOW
    );
    answerOther({
      ok: false,
      error: { code: "AUTHFN_OAUTH_STATE_INVALID", message: "mismatch" }
    } as unknown as ExchangeResult);

    expect(own).toMatchObject({ kind: "session", token: "test-session-token" });
    expect(await other).toEqual({ kind: "ignored" });
    expect(storedVerifier()).toBeDefined();
  });

  it("keeps the verifier after a failed exchange so a retry can still use it", async () => {
    const challenge = await beginSocialHandoff(NOW);
    const refused = exchangeClient({
      ok: false,
      error: { code: "AUTHFN_OAUTH_STATE_REPLAYED", message: "used" }
    } as unknown as ExchangeResult);

    expect(
      await resolveSocialHandoffToken({ token: "shc_test-handoff-code" }, refused.client, NOW)
    ).toEqual({ kind: "failed", errorCode: "AUTHFN_OAUTH_STATE_REPLAYED" });
    expect(await beginSocialHandoff(NOW + 1000)).toBe(challenge);
  });

  it("finishing a slow sign-in never clears a newer sign-in's verifier", async () => {
    await beginSocialHandoff(NOW);
    let answer: (value: ExchangeResult) => void = () => {};
    const client = async () =>
      ({
        exchangeSocialHandoff: () =>
          new Promise<ExchangeResult>((resolve) => {
            answer = resolve;
          })
      }) as unknown as SocialHandoffExchangeClient;

    const pending = resolveSocialHandoffToken({ token: "shc_test-handoff-code" }, client, NOW);
    await Promise.resolve();
    window.sessionStorage.clear();
    await beginSocialHandoff(NOW + 1000);
    const newer = storedVerifier();
    answer(exchanged("test-session-token", null));

    const result = await pending;
    expect(result.kind).toBe("session");
    if (result.kind === "session" && result.verifier) finishSocialHandoff(result.verifier);
    expect(storedVerifier()).toBe(newer);
  });

  it("never uses a code as a session when it can't be exchanged", async () => {

    await beginSocialHandoff(NOW);
    const refused = exchangeClient({
      ok: false,
      error: { code: "AUTHFN_VALIDATION_ERROR", message: "invalid" }
    } as unknown as ExchangeResult);
    expect(
      await resolveSocialHandoffToken(
        { token: "shc_test-handoff-code" },
        refused.client,
        NOW
      )
    ).toEqual({ kind: "failed", errorCode: "AUTHFN_VALIDATION_ERROR" });

    await beginSocialHandoff(NOW);
    const offline = exchangeClient(new Error("network down"));
    expect(
      await resolveSocialHandoffToken(
        { token: "test-handoff-code", handoff: "code" },
        offline.client,
        NOW
      )
    ).toEqual({ kind: "failed", errorCode: "handoff_exchange_failed" });
  });

  it("uses a session token as is and never sends it to the exchange", async () => {
    await beginSocialHandoff(NOW);
    const idle = exchangeClient(exchanged("other-session-token", null));

    expect(
      await resolveSocialHandoffToken(
        { token: "test-session-token", regionId: "insouth" },
        idle.client,
        NOW
      )
    ).toEqual({ kind: "session", token: "test-session-token", regionId: "insouth" });
    expect(idle.exchangeSocialHandoff).not.toHaveBeenCalled();
    expect(storedVerifier()).toBeDefined();
  });
});
