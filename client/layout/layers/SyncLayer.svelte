<svelte:options runes={true} />

<script lang="ts">
  import { flux } from "@21n/components/flux/flux";
  import account from "@21n/stores/account.store";
  import context from "@21n/stores/context.store";
  import { nucleumDatafnStatus, pullDatafnNow } from "@21n/stores/datafn.store";
  import { UserDataMode } from "@21n/types/account.type";
  import { onMount, onDestroy } from "svelte";
  let interval: ReturnType<typeof setInterval> | null = null;
  let isSyncing = $state(false);
  let isDestroyed = false;
  let lastDatafnSyncTimestamp = 0;
  let lastFluxSyncTimestamp = 0;
  let visibilityDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
  let currentSyncTimeout: ReturnType<typeof setTimeout> | null = null;

  const SYNC_INTERVAL = 3500;
  const MIN_SYNC_GAP = 2000;
  const VISIBILITY_DEBOUNCE = 1000;
  const MAX_SYNC_DURATION = 30000;

  onMount(() => {
    interval = setInterval(() => {
      void proceedSync({ isPullDatafn: false });
    }, SYNC_INTERVAL);

    document.addEventListener("visibilitychange", handleVisibilityChange);
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
  });

  async function proceedSync(options: { isPullDatafn?: boolean } = {}) {
    if (isDestroyed || isSyncing) return;
    if ($context.isInOfflineMode) return;
    const now = Date.now();
    const shouldSyncDatafn =
      options.isPullDatafn !== false &&
      $nucleumDatafnStatus.nucleumMode === "sync" &&
      now - lastDatafnSyncTimestamp >= MIN_SYNC_GAP;
    const shouldSyncFlux =
      $account.dataMode === UserDataMode.CLOUD &&
      Boolean(flux?.persistence) &&
      now - lastFluxSyncTimestamp >= MIN_SYNC_GAP;
    if (!shouldSyncDatafn && !shouldSyncFlux) return;

    isSyncing = true;
    if (shouldSyncDatafn) lastDatafnSyncTimestamp = now;
    if (shouldSyncFlux) lastFluxSyncTimestamp = now;

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
      await Promise.all([
        shouldSyncDatafn ? pullDatafnNow() : Promise.resolve(),
        shouldSyncFlux ? flux.sync() : Promise.resolve()
      ]);
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
</script>
