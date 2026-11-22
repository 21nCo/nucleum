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
let lastAppliedGeneration = 0;
/** The resolutions started that have not reached startUploadReplayForSession. */
const pendingGenerations = new Set<number>();
let filesRuntime: FilesRuntime | undefined;

type FilesRuntime = typeof import("@nucleum/shared-state/files/filefn-client");

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
 * which applies the resolution only while the session has not ended and no
 * resolution started after it has applied or is still pending, so a
 * resolution that returns after sign-out stores, hydrates and starts nothing,
 * and an older one never replaces or preempts a newer one's replay.
 */
export function beginSessionResolution(): SessionResolutionTicket {
  resolutionGeneration += 1;
  pendingGenerations.add(resolutionGeneration);
  return { signal: sessionLifetime.signal, generation: resolutionGeneration };
}

function isNewerResolutionPending(generation: number): boolean {
  for (const pending of pendingGenerations) {
    if (pending > generation) return true;
  }
  return false;
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
 * Nothing is applied once `ticket`'s session has ended or while a resolution
 * started after it has applied or is pending (see beginSessionResolution);
 * the result says whether it applied. Once the files
 * runtime is loaded, the resolution applies to it before any reconnect or
 * retry can resolve the session again, so a non-live resolution ends an
 * earlier live confirmation first; before that, no live confirmation exists,
 * and the caller does not wait for the FileFn client to load.
 */
export function startUploadReplayForSession(
  resolution: AuthSessionResolution,
  ticket: SessionResolutionTicket = beginSessionResolution()
): boolean {
  pendingGenerations.delete(ticket.generation);
  if (
    ticket.signal.aborted ||
    ticket.generation <= lastAppliedGeneration ||
    isNewerResolutionPending(ticket.generation)
  ) {
    return false;
  }
  lastAppliedGeneration = ticket.generation;
  const liveSession = resolveLiveSession(resolution);
  const apply = (files: FilesRuntime) => {
    if (resolution.status === "cached-cloud") files.startAccountUploadReplay();
    else if (liveSession) files.startAccountUploadReplay(liveSession);
    else files.stopAccountUploadReplay();
  };
  if (filesRuntime) {
    try {
      apply(filesRuntime);
    } catch (error) {
      logger.error({ at: "account.uploadReplay.start", error });
    }
  } else {
    loadFilesRuntime()
      .then((files) => {
        if (
          !ticket.signal.aborted &&
          lastAppliedGeneration === ticket.generation
        ) {
          apply(files);
        }
      })
      .catch((error: unknown) => {
        logger.error({ at: "account.uploadReplay.start", error });
      });
  }
  if (resolution.status === "cached-cloud") {
    recheckSession();
    if (resolution.storedState.isOffline) recheckIfConnected();
    else sessionRecheck?.scheduleRetry();
  } else if (resolution.status === "unavailable") {
    sessionRecheck?.scheduleRetry();
  } else {
    stopSessionRecheck();
  }
  return true;
}

async function loadFilesRuntime(): Promise<FilesRuntime> {
  filesRuntime ??= await import("@nucleum/shared-state/files/filefn-client");
  return filesRuntime;
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
  pendingGenerations.clear();
  stopSessionRecheck();
  return loadFilesRuntime()
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
 * before it stores, clears or applies anything. An attempt that fails, or
 * whose result cannot apply while a newer resolution is pending, keeps the
 * growing delay armed until a resolution settles the replay or a stop.
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
        if (current.signal.aborted) {
          pendingGenerations.delete(ticket.generation);
        } else if (!startUploadReplayForSession(resolution, ticket)) {
          retryWhileActive();
        }
      })
      .catch((error: unknown) => {
        pendingGenerations.delete(ticket.generation);
        logger.error({ at: "account.uploadReplay.reconnect", error });
        if (!current.signal.aborted) retryWhileActive();
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
  const scheduleRetry = () => {
    clearTimeout(retryTimer);
    const delay =
      RETRY_DELAYS_MS[Math.min(retries, RETRY_DELAYS_MS.length - 1)];
    retries += 1;
    retryTimer = setTimeout(recheck, delay);
  };
  const retryWhileActive = () => {
    if (!controller.signal.aborted) scheduleRetry();
  };
  sessionRecheck = {
    recheck,
    stop: () => {
      controller.abort();
      attempt?.abort();
      clearTimeout(retryTimer);
      stopOfflineMode();
    },
    scheduleRetry
  };
}
