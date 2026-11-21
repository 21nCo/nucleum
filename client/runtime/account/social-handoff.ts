import type { AuthFnSocialHandoffClient } from "@authfn/client";
import { getBrowserStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";

/**
 * How long a started native social sign-in keeps its verifier. Provider pages
 * (password, 2FA, consent) can take a while; the server's code itself lives
 * 60 seconds after the callback.
 */
export const SOCIAL_HANDOFF_TTL_MS = 15 * 60 * 1000;

/**
 * AuthFn's answer when a handoff code was not issued for this verifier. With
 * the callback broadcast to every macOS window, a window whose own sign-in was
 * cancelled or is still running gets it for another window's code and ignores
 * it.
 */
const CODE_NOT_FOR_THIS_VERIFIER = "AUTHFN_OAUTH_STATE_INVALID";

/** Prefix of the one-time codes AuthFn's social handoff issues. */
const SOCIAL_HANDOFF_CODE_PREFIX = "shc_";

interface PendingSocialHandoff {
  verifier: string;
  expiresAt: number;
  /** Account region the sign-in was started in, when known. */
  regionId?: string;
}

/** Client surface used to exchange a social handoff code. */
export type SocialHandoffExchangeClient = AuthFnSocialHandoffClient;

/**
 * Outcome of turning a native sign-in callback value into a session token.
 * `ignored` means this window has no live sign-in the code belongs to: on macOS
 * the shell broadcasts callbacks to every window, so another window may own it.
 */
export type SocialHandoffResolution =
  | { kind: "session"; token: string; regionId?: string; verifier?: string }
  | { kind: "failed"; errorCode: string }
  | { kind: "ignored" };

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

type StoredSocialHandoff =
  | { state: "live"; pending: PendingSocialHandoff }
  | { state: "expired" }
  | { state: "none" };

/**
 * Pending verifiers live in this WebView's session storage: each app window
 * keeps its own, so a callback the native shell broadcasts to every window is
 * exchanged only by the window that started the sign-in. Reads and writes are
 * synchronous, so two starts in one window can't interleave.
 */
function readSocialHandoff(now: number): StoredSocialHandoff {
  const stored = getBrowserStorage("sessionStorage")?.getItem(
    ClientStorageKey.AUTHFN_SOCIAL_HANDOFF
  );
  if (!stored) return { state: "none" };
  try {
    const pending = JSON.parse(stored) as Partial<PendingSocialHandoff>;
    if (
      typeof pending.verifier !== "string" ||
      typeof pending.expiresAt !== "number"
    ) {
      return { state: "none" };
    }
    if (pending.expiresAt <= now) return { state: "expired" };
    return {
      state: "live",
      pending: {
        verifier: pending.verifier,
        expiresAt: pending.expiresAt,
        ...(typeof pending.regionId === "string" ? { regionId: pending.regionId } : {})
      }
    };
  } catch {
    return { state: "none" };
  }
}

function writeSocialHandoff(pending: PendingSocialHandoff) {
  getBrowserStorage("sessionStorage")?.setItem(
    ClientStorageKey.AUTHFN_SOCIAL_HANDOFF,
    JSON.stringify(pending)
  );
}

/**
 * Forgets the verifier of an exchanged sign-in once the app is signed in with
 * it. Clears only if it is still `verifier`, not a newer sign-in's.
 */
export function finishSocialHandoff(verifier: string) {
  const storage = getBrowserStorage("sessionStorage");
  const stored = storage?.getItem(ClientStorageKey.AUTHFN_SOCIAL_HANDOFF);
  if (!stored) return;
  try {
    if ((JSON.parse(stored) as Partial<PendingSocialHandoff>).verifier !== verifier) {
      return;
    }
  } catch {
    return;
  }
  storage?.removeItem(ClientStorageKey.AUTHFN_SOCIAL_HANDOFF);
}

/**
 * Starts a code-and-verifier handoff in `regionId` and returns the challenge
 * for `startSocialSignIn`. A sign-in started while another is still pending in
 * this window reuses its verifier with a renewed deadline, so whichever
 * callback arrives can be exchanged.
 */
export async function beginSocialHandoff({
  regionId,
  now = Date.now()
}: { regionId?: string; now?: number } = {}): Promise<string> {
  const live = readSocialHandoff(now);
  const verifier =
    live.state === "live"
      ? live.pending.verifier
      : toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  writeSocialHandoff({
    verifier,
    expiresAt: now + SOCIAL_HANDOFF_TTL_MS,
    ...(regionId ? { regionId } : {})
  });
  return deriveSocialHandoffChallenge(verifier);
}

/** Returns and forgets this window's pending verifier, or undefined when none is live. */
export async function takeSocialHandoffVerifier(
  now = Date.now()
): Promise<string | undefined> {
  const stored = readSocialHandoff(now);
  getBrowserStorage("sessionStorage")?.removeItem(
    ClientStorageKey.AUTHFN_SOCIAL_HANDOFF
  );
  return stored.state === "live" ? stored.pending.verifier : undefined;
}

/**
 * True when a native sign-in callback value is a one-time handoff code.
 *
 * TODO(TIDY-640): installed native shells don't forward `handoff`, so the code
 * prefix identifies their codes; drop the prefix check once every supported
 * shell forwards `handoff`. The macOS shell also broadcasts the callback to
 * every window; in the same native release it should deliver it only to the
 * WebView that started the sign-in.
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
 * this window's pending verifier and never used as a session. The verifier
 * stays in place while the exchange runs; the caller passes the returned
 * `verifier` to `finishSocialHandoff` once the app is signed in (a retry
 * reuses it until then). The exchange goes to the region the callback names,
 * or else the one the sign-in was started in. A window with no live sign-in, or whose
 * verifier the code wasn't issued for, ignores it. Any other value is a
 * session token, which native Apple sign-in and sign-ins started without a
 * challenge return directly; it is never sent to the exchange.
 */
export async function resolveSocialHandoffToken(
  input: { token: string; handoff?: string; regionId?: string },
  client: (regionId?: string) => Promise<SocialHandoffExchangeClient>,
  now = Date.now()
): Promise<SocialHandoffResolution> {
  if (!isSocialHandoffCode(input)) {
    return { kind: "session", token: input.token, regionId: input.regionId };
  }
  const stored = readSocialHandoff(now);
  if (stored.state !== "live") return { kind: "ignored" };
  const verifier = stored.pending.verifier;
  try {
    const exchangeClient = await client(input.regionId ?? stored.pending.regionId);
    const response = await exchangeClient.exchangeSocialHandoff({
      code: input.token,
      verifier
    });
    if (!response.ok) {
      return response.error.code === CODE_NOT_FOR_THIS_VERIFIER
        ? { kind: "ignored" }
        : { kind: "failed", errorCode: response.error.code };
    }
    return {
      kind: "session",
      token: response.data.handoff.token,
      regionId: response.data.handoff.regionId ?? input.regionId,
      verifier
    };
  } catch {
    return { kind: "failed", errorCode: "handoff_exchange_failed" };
  }
}
