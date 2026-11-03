/**
 * Record whose "opened from here" history the frequently accessed section
 * shows: the open record page, unless it has no such history or the user
 * cleared it as the context. Undefined shows the generic list.
 */
export function resolveFrequentContext(
  pageId: string | null | undefined,
  fromHereCount: number,
  clearedContext: string | undefined
) {
  if (!pageId || fromHereCount === 0 || clearedContext === pageId)
    return undefined;
  return pageId;
}

/** Items each navigator section shows before "Show more". */
export const NAVIGATOR_SECTION_LIMIT = 5;

/**
 * Items a navigator section shows: all of them when expanded, otherwise the
 * first `limit`, with the count left out.
 */
export function limitSectionItems<T>(
  items: T[],
  isExpanded: boolean,
  limit = NAVIGATOR_SECTION_LIMIT
) {
  const visible = isExpanded ? items : items.slice(0, limit);
  return { visible, hiddenCount: items.length - visible.length };
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Short age of a visit for the navigator lists: "now", minutes, hours,
 * "Yesterday", days, then weeks.
 */
export function formatNavigatorAge(at: number, now: number) {
  const age = Math.max(0, now - at);
  if (age < MINUTE_MS) return "now";
  if (age < HOUR_MS) return `${Math.floor(age / MINUTE_MS)}m`;
  if (age < DAY_MS) return `${Math.floor(age / HOUR_MS)}h`;
  if (age < 2 * DAY_MS) return "Yesterday";
  if (age < 7 * DAY_MS) return `${Math.floor(age / DAY_MS)}d`;
  return `${Math.floor(age / (7 * DAY_MS))}w`;
}

/**
 * Whether a navigator history entry is listed: resources, and pages that are
 * nested views of an app menu page, such as a calendar layout. Top-level app
 * menu pages, which the app menu already offers, are left out.
 */
export function isNavigatorListedItem(item: {
  isRecord: boolean;
  pageAction?: { subViewOf?: string };
}) {
  if (item.pageAction) return !!item.pageAction.subViewOf;
  return item.isRecord;
}

/**
 * Whether opening an item from the navigator keeps it open: only when the
 * user has not asked to close it and it sits beside the content, either as
 * the side panel of a wide landscape layout or as the top bar search input.
 * On phones, portrait screens and constrained widths it would cover or
 * replace the opened page, so it closes.
 */
export function isNavigatorKeptOpen(layout: {
  isCloseAfterOpen: boolean;
  isPortrait: boolean;
  isConstrainedWidth: boolean;
  isInlineSearch: boolean;
}) {
  if (layout.isCloseAfterOpen || layout.isPortrait) return false;
  return !layout.isConstrainedWidth || layout.isInlineSearch;
}
