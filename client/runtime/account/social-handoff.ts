import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";

/**
 * How long a started native social sign-in keeps its verifier. Provider pages
 * (password, 2FA, consent) can take a while; the server's code itself lives
 * 60 seconds after the callback.
 */
export const SOCIAL_HANDOFF_TTL_MS = 15 * 60 * 1000;

interface PendingSocialHandoff {
  verifier: string;
  expiresAt: number;
}

/** Minimal client surface used to exchange a social handoff code. */
export interface SocialHandoffExchangeClient {
  exchangeSocialHandoff(input: { code: string; verifier: string }): Promise<
    | { ok: true; data: { handoff: { token: string; regionId: string | null } } }
    | { ok: false; error: { code: string; message: string } }
  >;
}

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

/**
 * Starts a code-and-verifier handoff: keeps a fresh random verifier for this
 * sign-in and returns its challenge for `startSocialSignIn`.
 */
export async function beginSocialHandoff(now = Date.now()): Promise<string> {
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
  const stored = await clientStorage.get(ClientStorageKey.AUTHFN_SOCIAL_HANDOFF);
  await clientStorage.remove(ClientStorageKey.AUTHFN_SOCIAL_HANDOFF);
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
    return pending.verifier;
  } catch {
    return undefined;
  }
}

/**
 * Resolves the `token` a native shell forwards after a social sign-in.
 *
 * With `handoff: "code"` (the callback of a sign-in started with a challenge)
 * the value is a one-time code, exchanged here with the pending verifier. A
 * shell that does not forward `handoff` sends the same code, so a live
 * verifier is tried first; when that exchange is refused the value is used as
 * a session token, which is what native Apple sign-in returns directly.
 */
export async function resolveSocialHandoffToken(
  input: { token: string; handoff?: string; regionId?: string },
  client: () => Promise<SocialHandoffExchangeClient>,
  now = Date.now()
): Promise<SocialHandoffResolution> {
  const verifier = await takeSocialHandoffVerifier(now);
  const isCode = input.handoff === "code";
  if (!verifier) {
    return isCode
      ? { kind: "failed", errorCode: "handoff_verifier_missing" }
      : { kind: "session", token: input.token, regionId: input.regionId };
  }
  const response = await (await client()).exchangeSocialHandoff({
    code: input.token,
    verifier
  });
  if (response.ok) {
    return {
      kind: "session",
      token: response.data.handoff.token,
      regionId: response.data.handoff.regionId ?? input.regionId
    };
  }
  if (isCode) return { kind: "failed", errorCode: response.error.code };
  return { kind: "session", token: input.token, regionId: input.regionId };
}
