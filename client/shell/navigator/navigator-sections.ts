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
