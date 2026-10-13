import context from "@nucleum/client/runtime/context.store";
import {
  nucleumDatafnStatus,
  datafnRuntime,
  type NucleumDatafnRuntime,
  pullDatafnNow,
  refreshNucleumDatafnStatus
} from "@nucleum/datafn/datafn.store";
import { get } from "svelte/store";

let foregroundPull:
  | {
      runtime: NucleumDatafnRuntime | null;
      promise: ReturnType<typeof pullDatafnNow>;
    }
  | undefined;

/** Coalesces overlapping focus and visibility pulls for the same runtime. */
export function pullForegroundDatafn() {
  const runtime = get(datafnRuntime);
  if (foregroundPull?.runtime === runtime) return foregroundPull.promise;
  const pending = { runtime, promise: pullDatafnNow() };
  foregroundPull = pending;
  void pending.promise
    .finally(() => {
      if (foregroundPull === pending) foregroundPull = undefined;
    })
    .catch(() => {});
  return pending.promise;
}

/** Installs visibility-triggered synchronization for a mounted application. */
export function installVisibilitySync() {
  let isSyncing = false;
  let isDestroyed = false;
  let lastSyncTimestamp = 0;
  let visibilityDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
  let currentSyncTimeout: ReturnType<typeof setTimeout> | null = null;

  const MIN_SYNC_GAP = 2000;
  const VISIBILITY_DEBOUNCE = 1000;
  const MAX_SYNC_DURATION = 30000;

  document.addEventListener("visibilitychange", handleVisibilityChange);

  const dispose = () => {
    isDestroyed = true;

    if (visibilityDebounceTimeout) {
      clearTimeout(visibilityDebounceTimeout);
      visibilityDebounceTimeout = null;
    }

    if (currentSyncTimeout) {
      clearTimeout(currentSyncTimeout);
      currentSyncTimeout = null;
    }

    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };

  async function proceedSync() {
    if (isDestroyed || isSyncing) return;
    if (get(context).isInOfflineMode) return;
    if (get(nucleumDatafnStatus).nucleumMode !== "sync") return;

    const now = Date.now();
    if (now - lastSyncTimestamp < MIN_SYNC_GAP) return;

    isSyncing = true;
    lastSyncTimestamp = now;

    let syncCompleted = false;
    currentSyncTimeout = setTimeout(() => {
      if (!syncCompleted && !isDestroyed) {
        console.warn(
          "Sync operation exceeded",
          MAX_SYNC_DURATION,
          "ms - may be hung"
        );
      }
    }, MAX_SYNC_DURATION);

    try {
      await pullForegroundDatafn();
      await refreshNucleumDatafnStatus();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      syncCompleted = true;
      if (currentSyncTimeout) {
        clearTimeout(currentSyncTimeout);
        currentSyncTimeout = null;
      }

      if (!isDestroyed) {
        isSyncing = false;
      }
    }
  }

  function handleVisibilityChange() {
    if (isDestroyed) return;

    if (!document.hidden) {
      if (visibilityDebounceTimeout) {
        clearTimeout(visibilityDebounceTimeout);
      }
      visibilityDebounceTimeout = setTimeout(() => {
        if (!isDestroyed) {
          proceedSync();
        }
      }, VISIBILITY_DEBOUNCE);
    }
  }
  return dispose;
}
