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
  return takeReopenDeadline(now) !== undefined;
}

/** Consumes a pending request; returns when its window ends, if still open. */
function takeReopenDeadline(now: number): number | undefined {
  const requestedAt = reopenRequestedAt;
  reopenRequestedAt = undefined;
  if (requestedAt === undefined) return undefined;
  const deadline = requestedAt + CALENDAR_OVERFLOW_MENU_REOPEN_WINDOW_MS;
  return now <= deadline ? deadline : undefined;
}

/**
 * Claims the pending reopen request for a newly mounted calendar layout, so
 * no later layout or resize can act on it. While `isPending`, the measured
 * layout keeps its compact presentation so the overflow trigger exists even
 * when the new layout would fit inline. `settle` answers true exactly once, when
 * the trigger is mounted within the reopen window; a trigger that only
 * appears after the window drops the request. The window is measured from
 * the pick, so a late claim never extends it. `isWithinWindow` lets the
 * caller recheck the same deadline when it actually opens the menu, so a
 * delayed frame after a successful settle never opens it late.
 */
export function claimCalendarOverflowMenuReopen(now = Date.now()) {
  const deadline = takeReopenDeadline(now) ?? Number.NEGATIVE_INFINITY;
  let isPending = deadline >= now;
  return {
    get isPending(): boolean {
      return isPending;
    },
    settle(hasTrigger: boolean, at = Date.now()): boolean {
      if (!isPending || (!hasTrigger && at <= deadline)) return false;
      isPending = false;
      return at <= deadline;
    },
    isWithinWindow(at = Date.now()): boolean {
      return at <= deadline;
    }
  };
}
