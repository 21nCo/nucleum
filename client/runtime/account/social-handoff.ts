import type { AuthFnSession, AuthFnSocialHandoffClient } from "@authfn/client";
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
 * `ignored` means this window has no live sign-in the code belongs to, on a
 * shell that broadcasts callbacks to every window (macOS), so another window
 * may own it; other shells get `failed` instead.
 */
export type SocialHandoffResolution =
  | {
      kind: "session";
      token: string;
      regionId?: string;
      verifier?: string;
      /** The session the exchange returned, so the caller needn't look it up again. */
      session?: AuthFnSession;
    }
  | { kind: "failed"; errorCode: string }
  | { kind: "ignored" };

/** Reported when a code reaches a window without a matching sign-in on a shell that doesn't broadcast. */
const NOT_STARTED_HERE = "handoff_not_started_here";

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

/** The verifier stored in this window, live or expired, if any. */
function storedVerifier(): string | undefined {
  const stored = getBrowserStorage("sessionStorage")?.getItem(
    ClientStorageKey.AUTHFN_SOCIAL_HANDOFF
  );
  if (!stored) return undefined;
  try {
    const verifier = (JSON.parse(stored) as Partial<PendingSocialHandoff>).verifier;
    return typeof verifier === "string" ? verifier : undefined;
  } catch {
    return undefined;
  }
}

/** True while `verifier` is still this window's current sign-in, not replaced by a newer one. */
export function isCurrentSocialHandoff(verifier: string): boolean {
  return storedVerifier() === verifier;
}

/** True while `challenge` belongs to this window's current sign-in. */
export async function isCurrentSocialHandoffChallenge(challenge: string): Promise<boolean> {
  const verifier = storedVerifier();
  return verifier !== undefined && (await deriveSocialHandoffChallenge(verifier)) === challenge;
}

/** Cancels this window's pending browser sign-in, e.g. when another sign-in method starts. */
export function cancelSocialHandoff() {
  getBrowserStorage("sessionStorage")?.removeItem(
    ClientStorageKey.AUTHFN_SOCIAL_HANDOFF
  );
}

/**
 * Forgets the verifier of an exchanged sign-in once the app is signed in with
 * it. Clears only if it is still `verifier`, not a newer sign-in's.
 */
export function finishSocialHandoff(verifier: string) {
  if (storedVerifier() !== verifier) return;
  getBrowserStorage("sessionStorage")?.removeItem(
    ClientStorageKey.AUTHFN_SOCIAL_HANDOFF
  );
}

/**
 * Starts a code-and-verifier handoff in `regionId` and returns the challenge
 * for `startSocialSignIn`. Every sign-in gets a fresh verifier and replaces any
 * earlier one in this window, so only the newest sign-in can complete.
 */
export async function beginSocialHandoff({
  regionId,
  now = Date.now()
}: { regionId?: string; now?: number } = {}): Promise<string> {
  const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
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
 * `verifier` to `finishSocialHandoff` once the app is signed in. Any outcome for a sign-in that a newer one in this
 * window replaced while the exchange ran is discarded as `ignored`; callers
 * recheck `isCurrentSocialHandoff` before applying the session. The exchange goes to the region the callback names,
 * or else the one the sign-in was started in. A window with no live sign-in, or whose
 * verifier the code wasn't issued for, ignores it. Any other value is a
 * session token, which native Apple sign-in and sign-ins started without a
 * challenge return directly; it is never sent to the exchange.
 */
export async function resolveSocialHandoffToken(
  input: {
    token: string;
    handoff?: string;
    regionId?: string;
    /** True when the native shell delivers each callback to every window. */
    isBroadcast?: boolean;
  },
  client: (regionId?: string) => Promise<SocialHandoffExchangeClient>,
  now = Date.now()
): Promise<SocialHandoffResolution> {
  if (!isSocialHandoffCode(input)) {
    return { kind: "session", token: input.token, regionId: input.regionId };
  }
  const notOurs: SocialHandoffResolution = input.isBroadcast
    ? { kind: "ignored" }
    : { kind: "failed", errorCode: NOT_STARTED_HERE };
  const stored = readSocialHandoff(now);
  if (stored.state !== "live") return notOurs;
  const verifier = stored.pending.verifier;
  const exchangeRegionId = input.regionId ?? stored.pending.regionId;
  let result: SocialHandoffResolution;
  try {
    const exchangeClient = await client(exchangeRegionId);
    const response = await exchangeClient.exchangeSocialHandoff({
      code: input.token,
      verifier
    });
    if (!response.ok) {
      result =
        response.error.code === CODE_NOT_FOR_THIS_VERIFIER
          ? notOurs
          : { kind: "failed", errorCode: response.error.code };
    } else {
      result = {
        kind: "session",
        token: response.data.handoff.token,
        regionId: response.data.handoff.regionId ?? exchangeRegionId,
        verifier,
        session: response.data.session
      };
    }
  } catch {
    result = { kind: "failed", errorCode: "handoff_exchange_failed" };
  }
  return isCurrentSocialHandoff(verifier) ? result : { kind: "ignored" };
}
