import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SOCIAL_HANDOFF_TTL_MS,
  beginSocialHandoff,
  deriveSocialHandoffChallenge,
  finishSocialHandoff,
  isCurrentSocialHandoff,
  resolveSocialHandoffToken,
  takeSocialHandoffVerifier,
  type SocialHandoffExchangeClient
} from "@nucleum/client/runtime/account/social-handoff";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";

const NOW = Date.UTC(2026, 10, 21, 10, 0, 0);

type ExchangeResult = Awaited<
  ReturnType<SocialHandoffExchangeClient["exchangeSocialHandoff"]>
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
    const challenge = await beginSocialHandoff({ now: NOW });
    const verifier = storedVerifier();

    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toBe(await deriveSocialHandoffChallenge(verifier ?? ""));
  });

  it("gives every sign-in a fresh verifier that replaces the previous one", async () => {
    const first = await beginSocialHandoff({ regionId: "useast", now: NOW });
    const firstVerifier = storedVerifier() ?? "";
    const second = await beginSocialHandoff({ regionId: "useast", now: NOW + 1000 });

    expect(second).not.toBe(first);
    expect(isCurrentSocialHandoff(firstVerifier)).toBe(false);
  });

  it("hands the verifier out once and not after it expires", async () => {
    await beginSocialHandoff({ now: NOW });
    const verifier = storedVerifier();

    expect(await takeSocialHandoffVerifier(NOW + 1000)).toBe(verifier);
    expect(await takeSocialHandoffVerifier(NOW + 1000)).toBeUndefined();

    await beginSocialHandoff({ now: NOW });
    expect(
      await takeSocialHandoffVerifier(NOW + SOCIAL_HANDOFF_TTL_MS)
    ).toBeUndefined();
    expect(window.sessionStorage.getItem(ClientStorageKey.AUTHFN_SOCIAL_HANDOFF)).toBeNull();
  });

});

describe("resolveSocialHandoffToken", () => {
  it("exchanges a one-time code with the pending verifier", async () => {
    await beginSocialHandoff({ now: NOW });
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
    await beginSocialHandoff({ now: NOW });
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

  it("exchanges in the region the callback names, else the one the sign-in started in", async () => {
    await beginSocialHandoff({ regionId: "useast", now: NOW });
    const regions: (string | undefined)[] = [];
    const exchangeSocialHandoff = vi.fn(async () => exchanged("test-session-token", null));
    const client = async (regionId?: string) => {
      regions.push(regionId);
      return { exchangeSocialHandoff } as unknown as SocialHandoffExchangeClient;
    };

    const started = await resolveSocialHandoffToken(
      { token: "shc_test-handoff-code" },
      client,
      NOW
    );
    expect(started).toMatchObject({ kind: "session", regionId: "useast" });
    await resolveSocialHandoffToken(
      { token: "shc_test-handoff-code", regionId: "euwest" },
      client,
      NOW
    );

    expect(regions).toEqual(["useast", "euwest"]);
  });

  it("discards a sign-in that a newer one replaced while its exchange ran", async () => {
    await beginSocialHandoff({ regionId: "useast", now: NOW });
    let answer: (value: ExchangeResult) => void = () => {};
    const client = async () =>
      ({
        exchangeSocialHandoff: () =>
          new Promise<ExchangeResult>((resolve) => {
            answer = resolve;
          })
      }) as unknown as SocialHandoffExchangeClient;

    const pending = resolveSocialHandoffToken({ token: "shc_test-handoff-code" }, client, NOW);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await beginSocialHandoff({ regionId: "euwest", now: NOW + 1000 });
    answer(exchanged("test-session-token", "useast"));

    expect(await pending).toEqual({ kind: "ignored" });
  });

  it("keeps the verifier after a failed exchange until a newer sign-in replaces it", async () => {
    await beginSocialHandoff({ now: NOW });
    const verifier = storedVerifier();
    const refused = exchangeClient({
      ok: false,
      error: { code: "AUTHFN_OAUTH_STATE_REPLAYED", message: "used" }
    } as unknown as ExchangeResult);

    expect(
      await resolveSocialHandoffToken({ token: "shc_test-handoff-code" }, refused.client, NOW)
    ).toEqual({ kind: "failed", errorCode: "AUTHFN_OAUTH_STATE_REPLAYED" });
    expect(storedVerifier()).toBe(verifier);
  });

  it("drops a replaced sign-in's failure instead of reporting it", async () => {
    await beginSocialHandoff({ regionId: "useast", now: NOW });
    let fail: (error: Error) => void = () => {};
    const client = async () =>
      ({
        exchangeSocialHandoff: () =>
          new Promise<ExchangeResult>((_, reject) => {
            fail = reject;
          })
      }) as unknown as SocialHandoffExchangeClient;

    const pending = resolveSocialHandoffToken({ token: "shc_test-handoff-code" }, client, NOW);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const retry = await beginSocialHandoff({ regionId: "euwest", now: NOW + 1000 });
    fail(new Error("network down"));

    expect(await pending).toEqual({ kind: "ignored" });
    expect(retry).not.toBe(undefined);
    expect(isCurrentSocialHandoff(storedVerifier() ?? "")).toBe(true);
  });

  it("reports a code with no matching sign-in on a shell that doesn't broadcast", async () => {
    const single = exchangeClient(exchanged("test-session-token", null));
    expect(
      await resolveSocialHandoffToken({ token: "shc_test-handoff-code" }, single.client, NOW)
    ).toEqual({ kind: "failed", errorCode: "handoff_not_started_here" });
  });

  it("leaves a code to the window that started the sign-in", async () => {
    const elsewhere = exchangeClient(exchanged("test-session-token", null));
    expect(
      await resolveSocialHandoffToken(
        { token: "shc_test-handoff-code", isBroadcast: true },
        elsewhere.client,
        NOW
      )
    ).toEqual({ kind: "ignored" });
    expect(elsewhere.exchangeSocialHandoff).not.toHaveBeenCalled();
  });

  it("keeps its verifier when another window's code arrives", async () => {
    await beginSocialHandoff({ now: NOW });
    const verifier = storedVerifier();
    const other = exchangeClient({
      ok: false,
      error: { code: "AUTHFN_OAUTH_STATE_INVALID", message: "mismatch" }
    } as unknown as ExchangeResult);

    expect(
      await resolveSocialHandoffToken(
        { token: "shc_test-other-window-code", isBroadcast: true },
        other.client,
        NOW
      )
    ).toEqual({ kind: "ignored" });
    expect(storedVerifier()).toBe(verifier);
  });

  it("treats an expired sign-in as none, so a broadcast code shows no error", async () => {
    await beginSocialHandoff({ now: NOW });
    const expired = exchangeClient(exchanged("test-session-token", null));
    expect(
      await resolveSocialHandoffToken(
        { token: "shc_test-handoff-code", isBroadcast: true },
        expired.client,
        NOW + SOCIAL_HANDOFF_TTL_MS
      )
    ).toEqual({ kind: "ignored" });
    expect(expired.exchangeSocialHandoff).not.toHaveBeenCalled();
  });

  it("keeps the verifier available while another window's code is being checked", async () => {
    await beginSocialHandoff({ now: NOW });
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
      { token: "shc_test-other-window-code", isBroadcast: true },
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

  it("a slow, replaced sign-in neither signs in nor clears the newer verifier", async () => {
    await beginSocialHandoff({ now: NOW });
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
    await beginSocialHandoff({ now: NOW + 1000 });
    const newer = storedVerifier();
    answer(exchanged("test-session-token", null));

    expect(await pending).toEqual({ kind: "ignored" });
    finishSocialHandoff("test-older-verifier");
    expect(storedVerifier()).toBe(newer);
  });

  it("never uses a code as a session when it can't be exchanged", async () => {

    await beginSocialHandoff({ now: NOW });
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

    await beginSocialHandoff({ now: NOW });
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
    await beginSocialHandoff({ now: NOW });
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
