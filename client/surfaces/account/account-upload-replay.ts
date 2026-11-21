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
 * restore started, keeping the account's queue and pending deletes. The caller
 * does not wait for the FileFn client to load.
 */
export function startUploadReplayForSession(
  resolution: AuthSessionResolution
): void {
  if (resolution.status === "cached-cloud") {
    recheckSession();
    if (resolution.storedState.isOffline) recheckIfConnected();
    else sessionRecheck?.scheduleRetry();
  } else if (resolution.status !== "unavailable") {
    stopSessionRecheck();
  }
  const liveSession = resolveLiveSession(resolution);
  import("@nucleum/shared-state/files/filefn-client")
    .then((files) => {
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
 * Stops the upload replay on sign-out: a pending resolution of the stored
 * session neither stores its session nor authorizes the replay, and the
 * client the restore bound is torn down.
 */
export function stopUploadReplayForSession(): void {
  stopSessionRecheck();
  import("@nucleum/shared-state/files/filefn-client")
    .then((files) => files.stopAccountUploadReplay())
    .catch((error: unknown) => {
      logger.error({ at: "account.uploadReplay.stop", error });
    });
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
    resolveAuthSession({ signal: current.signal })
      .then((resolution) => {
        if (!current.signal.aborted) startUploadReplayForSession(resolution);
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
