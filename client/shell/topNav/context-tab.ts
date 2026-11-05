/**
 * Whether the top bar shows its context tab: for a bulk selection, a page
 * subject or a registered entry, and on the home page, where the tab shows
 * the date when nothing else fills it.
 */
export function isContextTabShown(state: {
  isBulkMode: boolean;
  hasSubject: boolean;
  hasActiveEntry: boolean;
  isHomePage: boolean;
}) {
  return (
    state.isBulkMode ||
    state.hasSubject ||
    state.hasActiveEntry ||
    state.isHomePage
  );
}
