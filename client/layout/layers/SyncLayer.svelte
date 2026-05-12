<svelte:options runes={true} />

<script lang="ts">
  import { flux } from "@21n/components/flux/flux";
  import account from "@21n/stores/account.store";
  import context from "@21n/stores/context.store";
  import { UserDataMode } from "@21n/types/account.type";
  import { onMount, onDestroy } from "svelte";
  let interval: ReturnType<typeof setInterval> | null = null;
  let isSyncing = $state(false);
  let isDestroyed = false;
  let lastSyncTimestamp = 0;
  let visibilityDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
  let currentSyncTimeout: ReturnType<typeof setTimeout> | null = null;

  const SYNC_INTERVAL = 3500;
  const MIN_SYNC_GAP = 2000;
  const VISIBILITY_DEBOUNCE = 1000;
  const MAX_SYNC_DURATION = 30000;

  onMount(() => {
    interval = setInterval(() => {
      // proceedSync();
    }, SYNC_INTERVAL);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
  });

  onDestroy(() => {
    isDestroyed = true;

    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    if (visibilityDebounceTimeout) {
      clearTimeout(visibilityDebounceTimeout);
      visibilityDebounceTimeout = null;
    }

    if (currentSyncTimeout) {
      clearTimeout(currentSyncTimeout);
      currentSyncTimeout = null;
    }

    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  async function proceedSync() {
    if (isDestroyed || isSyncing) return;
    if ($account.dataMode !== UserDataMode.CLOUD || $context.isInOfflineMode)
      return;

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
      await flux?.sync();
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

  /**
   * TODO - use navigator.sendBeacon and beacon endpoint on sync server with in memory mutations readily available for sync
   */
  function handleBeforeUnload() {
    if (!isDestroyed && !isSyncing) {
      proceedSync();
    }
  }
</script>
