/** Search results and the trimmed query they were found for. */
export type NavigatorSearchResults = {
  query: string;
  ids: string[];
};

/**
 * Resource that Enter opens from the navigator search: the first result, only when
 * the results belong to the current non-empty query.
 */
export function resolveNavigatorSearchTarget(
  query: string,
  results: NavigatorSearchResults
) {
  const trimmed = query.trim();
  if (!trimmed || results.query !== trimmed) return undefined;
  return results.ids[0];
}
