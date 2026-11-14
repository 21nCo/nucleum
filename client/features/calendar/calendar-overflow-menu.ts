/**
 * Picking a layout in the calendar overflow menu swaps the whole calendar
 * view, which unmounts the menu with it. The pick asks the next calendar
 * layout to reopen its overflow menu, so the menu reads as staying open.
 */

/** How long after a pick a newly mounted calendar layout may reopen the menu. */
export const CALENDAR_OVERFLOW_MENU_REOPEN_WINDOW_MS = 1000;

let reopenRequestedAt: number | undefined;

/** Records that the overflow menu should reopen once the new layout mounts. */
export function requestCalendarOverflowMenuReopen(now = Date.now()): void {
  reopenRequestedAt = now;
}

/**
 * Consumes a pending reopen request. Returns true only for a request made
 * within the reopen window, so a stale one never opens the menu later.
 */
export function takeCalendarOverflowMenuReopen(now = Date.now()): boolean {
  const requestedAt = reopenRequestedAt;
  reopenRequestedAt = undefined;
  return (
    requestedAt !== undefined &&
    now - requestedAt <= CALENDAR_OVERFLOW_MENU_REOPEN_WINDOW_MS
  );
}
