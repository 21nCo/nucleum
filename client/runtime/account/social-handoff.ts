import type { AuthFnRegionalClient } from "@authfn/client";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";

/**
 * How long a started native social sign-in keeps its verifier. Provider pages
 * (password, 2FA, consent) can take a while; the server's code itself lives
 * 60 seconds after the callback.
 */
export const SOCIAL_HANDOFF_TTL_MS = 15 * 60 * 1000;

/** Prefix of the one-time codes AuthFn's social handoff issues. */
const SOCIAL_HANDOFF_CODE_PREFIX = "shc_";

interface PendingSocialHandoff {
  verifier: string;
  expiresAt: number;
}

/** Client surface used to exchange a social handoff code. */
export type SocialHandoffExchangeClient = Pick<
  AuthFnRegionalClient,
  "exchangeSocialHandoff"
>;

/** Outcome of turning a native sign-in callback value into a session token. */
export type SocialHandoffResolution =
  | { kind: "session"; token: string; regionId?: string }
  | { kind: "failed"; errorCode: string };

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Base64url SHA-256 of the verifier, as AuthFn expects for `handoffChallenge`. */
export async function deriveSocialHandoffChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return toBase64Url(new Uint8Array(digest));
}

async function readPendingSocialHandoff(
  now: number
): Promise<PendingSocialHandoff | undefined> {
  const stored = await clientStorage.get(ClientStorageKey.AUTHFN_SOCIAL_HANDOFF);
  if (!stored) return undefined;
  try {
    const pending = JSON.parse(stored) as Partial<PendingSocialHandoff>;
    if (
      typeof pending.verifier !== "string" ||
      typeof pending.expiresAt !== "number" ||
      pending.expiresAt <= now
    ) {
      return undefined;
    }
    return { verifier: pending.verifier, expiresAt: pending.expiresAt };
  } catch {
    return undefined;
  }
}

/**
 * Starts a code-and-verifier handoff and returns the challenge for
 * `startSocialSignIn`. A sign-in started while another is still pending reuses
 * its verifier, so whichever callback arrives can be exchanged.
 */
export async function beginSocialHandoff(now = Date.now()): Promise<string> {
  const live = await readPendingSocialHandoff(now);
  if (live) return deriveSocialHandoffChallenge(live.verifier);
  const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const pending: PendingSocialHandoff = {
    verifier,
    expiresAt: now + SOCIAL_HANDOFF_TTL_MS
  };
  await clientStorage.set(
    ClientStorageKey.AUTHFN_SOCIAL_HANDOFF,
    JSON.stringify(pending)
  );
  return deriveSocialHandoffChallenge(verifier);
}

/** Returns and forgets the pending verifier, or undefined when none is live. */
export async function takeSocialHandoffVerifier(
  now = Date.now()
): Promise<string | undefined> {
  const pending = await readPendingSocialHandoff(now);
  await clientStorage.remove(ClientStorageKey.AUTHFN_SOCIAL_HANDOFF);
  return pending?.verifier;
}

/**
 * True when a native sign-in callback value is a one-time handoff code.
 *
 * TODO(TIDY-640): installed native shells don't forward `handoff`, so the code
 * prefix identifies their codes; drop the prefix check once every supported
 * shell forwards `handoff`.
 */
export function isSocialHandoffCode(input: {
  token: string;
  handoff?: string;
}): boolean {
  return (
    input.handoff === "code" || input.token.startsWith(SOCIAL_HANDOFF_CODE_PREFIX)
  );
}

/**
 * Resolves the `token` a native shell forwards after a social sign-in.
 *
 * A one-time code (flagged `handoff: "code"`, or carrying AuthFn's code prefix
 * because installed native shells don't forward `handoff`) is exchanged with
 * the pending verifier and never used as a session. Any other value is a
 * session token, which native Apple sign-in and sign-ins started without a
 * challenge return directly; it is never sent to the exchange.
 */
export async function resolveSocialHandoffToken(
  input: { token: string; handoff?: string; regionId?: string },
  client: () => Promise<SocialHandoffExchangeClient>,
  now = Date.now()
): Promise<SocialHandoffResolution> {
  if (!isSocialHandoffCode(input)) {
    return { kind: "session", token: input.token, regionId: input.regionId };
  }
  const verifier = await takeSocialHandoffVerifier(now);
  if (!verifier) return { kind: "failed", errorCode: "handoff_verifier_missing" };
  try {
    const exchangeClient = await client();
    if (!exchangeClient.exchangeSocialHandoff) {
      return { kind: "failed", errorCode: "handoff_exchange_unavailable" };
    }
    const response = await exchangeClient.exchangeSocialHandoff({
      code: input.token,
      verifier
    });
    if (!response.ok) return { kind: "failed", errorCode: response.error.code };
    return {
      kind: "session",
      token: response.data.handoff.token,
      regionId: response.data.handoff.regionId ?? input.regionId
    };
  } catch {
    return { kind: "failed", errorCode: "handoff_exchange_failed" };
  }
}
