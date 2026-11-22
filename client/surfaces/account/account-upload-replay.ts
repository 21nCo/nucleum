import type { AuthSessionResolution } from "@nucleum/client/runtime/account/auth.type";
import { resolveAuthSession } from "@nucleum/client/runtime/account/auth";
import { determineIfOffline } from "@nucleum/client/runtime/connectivity";
import context from "@nucleum/client/runtime/context.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import type { FileFnAccountScope } from "@nucleum/shared-state/files/filefn-client";

const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 300_000];

let sessionRecheck:
  | { stop: () => void; scheduleRetry: () => void; recheck: () => void }
  | undefined;
let sessionLifetime = new AbortController();
let endingSessions = 0;
let resolutionGeneration = 0;

/**
 * One resolution of the stored session: `signal` is the page session it
 * belongs to, which sign-out aborts (see stopUploadReplayForSession), and
 * `generation` orders it among the page's resolutions.
 */
export interface SessionResolutionTicket {
  readonly signal: AbortSignal;
  readonly generation: number;
}

/**
 * Starts a resolution of the stored session. The caller passes the ticket's
 * signal to resolveAuthSession and the ticket to startUploadReplayForSession,
 * which applies the resolution only while no newer one started and the session
 * has not ended, so a resolution that returns after sign-out stores, hydrates
 * and starts nothing, and an older one never replaces a newer one's replay.
 */
export function beginSessionResolution(): SessionResolutionTicket {
  resolutionGeneration += 1;
  return { signal: sessionLifetime.signal, generation: resolutionGeneration };
}

function isCurrentResolution(ticket: SessionResolutionTicket): boolean {
  return !ticket.signal.aborted && ticket.generation === resolutionGeneration;
}

/**
 * Applies a resolution of the stored session to the signed-in cloud account's
 * upload replay, without waiting for a page that renders or captures a file
 * (see the files runtime's startAccountUploadReplay). A live session
 * (`authenticated`) starts it for the account state's cloud user only when
 * that user and region are the session's. A cached cloud session restored
 * offline (`cached-cloud`) binds the stored account's client, which sends
 * nothing until the stored session, resolved again on the next reconnect,
 * confirms the account (see recheckSession). Any other resolution
 * (offline-only, expired, signed-out or unavailable) stops the replay the
 * restore started, keeping the account's queue and pending deletes; an
 * unavailable one keeps an active recheck retrying with its growing delay.
 * Nothing is applied once `ticket`'s session has ended or a newer resolution
 * started (see beginSessionResolution). The caller does not wait for the
 * FileFn client to load.
 */
export function startUploadReplayForSession(
  resolution: AuthSessionResolution,
  ticket: SessionResolutionTicket = beginSessionResolution()
): void {
  if (!isCurrentResolution(ticket)) return;
  if (resolution.status === "cached-cloud") {
    recheckSession();
    if (resolution.storedState.isOffline) recheckIfConnected();
    else sessionRecheck?.scheduleRetry();
  } else if (resolution.status === "unavailable") {
    sessionRecheck?.scheduleRetry();
  } else {
    stopSessionRecheck();
  }
  const liveSession = resolveLiveSession(resolution);
  import("@nucleum/shared-state/files/filefn-client")
    .then((files) => {
      if (!isCurrentResolution(ticket)) return;
      if (resolution.status === "cached-cloud")
        files.startAccountUploadReplay();
      else if (liveSession) files.startAccountUploadReplay(liveSession);
      else files.stopAccountUploadReplay();
    })
    .catch((error: unknown) => {
      logger.error({ at: "account.uploadReplay.start", error });
    });
}

function resolveLiveSession(
  resolution: AuthSessionResolution
): FileFnAccountScope | null {
  if (resolution.status !== "authenticated") return null;
  const { session } = resolution;
  const userId = String(session.actorId ?? "")
    .replace(/^user:/, "")
    .trim();
  if (!userId) return null;
  const region = (session.regionId ?? session.subject?.regionId)?.trim();
  return { userId, region: region || null };
}

/**
 * Stops the upload replay on sign-out: it ends the session's lifetime, so a
 * pending resolution of the stored session, or one started before the
 * sign-out reopens the lifetime (see reopenSessionLifetime), neither stores
 * its session nor authorizes the replay, and ends the session's replay
 * authorization (see the files runtime's endAccountUploadReplay), tearing the
 * bound client down. The returned promise settles once the authorization has
 * ended; it never rejects.
 */
export function stopUploadReplayForSession(): Promise<void> {
  endingSessions += 1;
  sessionLifetime.abort();
  stopSessionRecheck();
  return import("@nucleum/shared-state/files/filefn-client")
    .then((files) => files.endAccountUploadReplay())
    .catch((error: unknown) => {
      logger.error({ at: "account.uploadReplay.stop", error });
    });
}

/**
 * Opens the next session lifetime once a sign-out (see
 * stopUploadReplayForSession) has finished, and no other is still running.
 */
export function reopenSessionLifetime(): void {
  endingSessions = Math.max(0, endingSessions - 1);
  if (endingSessions === 0 && sessionLifetime.signal.aborted) {
    sessionLifetime = new AbortController();
  }
}

function stopSessionRecheck() {
  sessionRecheck?.stop();
  sessionRecheck = undefined;
}

/** Resolves the session again when connectivity returned before the recheck listened for it. */
function recheckIfConnected() {
  const current = sessionRecheck;
  determineIfOffline()
    .then((isOffline) => {
      if (!isOffline && current === sessionRecheck) current?.recheck();
    })
    .catch((error: unknown) => {
      logger.error({ at: "account.uploadReplay.connectivity", error });
    });
}

/**
 * Resolves the stored session again on every reconnect, when the app's offline
 * mode ends, and, after an AuthFn failure while connected, with a growing
 * delay, until a resolution other than a cached or unavailable one settles
 * the restored replay. A newer resolution or a stop aborts the pending one
 * before it stores, clears or applies anything.
 */
function recheckSession() {
  if (sessionRecheck) return;
  const controller = new AbortController();
  let attempt: AbortController | undefined;
  let retries = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  const recheck = () => {
    clearTimeout(retryTimer);
    attempt?.abort();
    const current = new AbortController();
    attempt = current;
    const ticket = beginSessionResolution();
    resolveAuthSession({ signal: current.signal })
      .then((resolution) => {
        if (!current.signal.aborted) {
          startUploadReplayForSession(resolution, ticket);
        }
      })
      .catch((error: unknown) => {
        logger.error({ at: "account.uploadReplay.reconnect", error });
      });
  };
  globalThis.addEventListener?.("online", recheck, {
    signal: controller.signal
  });
  let wasOfflineMode: boolean | undefined;
  const stopOfflineMode = context.subscribe(({ isInOfflineMode }) => {
    if (wasOfflineMode && !isInOfflineMode) recheck();
    wasOfflineMode = isInOfflineMode;
  });
  sessionRecheck = {
    recheck,
    stop: () => {
      controller.abort();
      attempt?.abort();
      clearTimeout(retryTimer);
      stopOfflineMode();
    },
    scheduleRetry: () => {
      clearTimeout(retryTimer);
      const delay =
        RETRY_DELAYS_MS[Math.min(retries, RETRY_DELAYS_MS.length - 1)];
      retries += 1;
      retryTimer = setTimeout(recheck, delay);
    }
  };
}
