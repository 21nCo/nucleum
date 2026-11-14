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

/** Layout state of a newly mounted calendar layout, as the reopen sees it. */
export type CalendarOverflowMenuLayoutState = {
  /** Whether the controls have been measured, so compactness is settled. */
  isMeasured: boolean;
  /** Whether the controls are compact and show the overflow menu trigger. */
  isCompact: boolean;
  /** Whether the overflow menu trigger is mounted. */
  hasTrigger: boolean;
};

/**
 * Claims the pending reopen request for a newly mounted calendar layout, so
 * no later layout or resize can act on it. The returned `settle` waits until
 * the layout is measured and, when compact, its trigger is mounted, then
 * answers true exactly once if the menu should reopen. A layout that settles
 * inline, or settles after the reopen window, drops the request for good.
 */
export function claimCalendarOverflowMenuReopen(now = Date.now()) {
  let isPending = takeCalendarOverflowMenuReopen(now);
  const deadline = now + CALENDAR_OVERFLOW_MENU_REOPEN_WINDOW_MS;
  return {
    settle(state: CalendarOverflowMenuLayoutState, at = Date.now()): boolean {
      if (!isPending) return false;
      if (at > deadline) {
        isPending = false;
        return false;
      }
      if (!state.isMeasured || (state.isCompact && !state.hasTrigger))
        return false;
      isPending = false;
      return state.isCompact;
    }
  };
}
