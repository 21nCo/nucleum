import { readable, type Readable } from "svelte/store";

/** A sync shorter than this never shows an indicator. */
export const SYNC_INDICATOR_SHOW_DELAY_MS = 700;

/** Once shown, the indicator stays at least this long so it never blinks. */
export const SYNC_INDICATOR_MIN_VISIBLE_MS = 400;

/**
 * Turns a raw "is syncing" signal into indicator visibility: it becomes
 * visible only after syncing has lasted `showDelayMs` without a break, and
 * once visible it stays for at least `minVisibleMs` after syncing stops.
 */
export function delayedSyncVisibility(
  isSyncing: Readable<boolean>,
  showDelayMs = SYNC_INDICATOR_SHOW_DELAY_MS,
  minVisibleMs = SYNC_INDICATOR_MIN_VISIBLE_MS
): Readable<boolean> {
  return readable(false, (set) => {
    let isVisible = false;
    let visibleSince = 0;
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const clearTimers = () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      showTimer = undefined;
      hideTimer = undefined;
    };

    const unsubscribe = isSyncing.subscribe((syncing) => {
      if (syncing) {
        clearTimeout(hideTimer);
        hideTimer = undefined;
        if (isVisible || showTimer) return;
        showTimer = setTimeout(() => {
          showTimer = undefined;
          isVisible = true;
          visibleSince = Date.now();
          set(true);
        }, showDelayMs);
        return;
      }
      clearTimeout(showTimer);
      showTimer = undefined;
      if (!isVisible || hideTimer) return;
      const remaining = Math.max(0, minVisibleMs - (Date.now() - visibleSince));
      hideTimer = setTimeout(() => {
        hideTimer = undefined;
        isVisible = false;
        set(false);
      }, remaining);
    });

    return () => {
      unsubscribe();
      clearTimers();
    };
  });
}
