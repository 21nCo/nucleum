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
