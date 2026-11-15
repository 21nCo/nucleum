/** The item a space's side nav shows, kept while the side nav remounts. */
export type SpaceSelection = {
  selectedItemId: string | null;
  /** The user closed the item, so the space shows its empty panel. */
  isClosedByUser: boolean;
};

/**
 * Where a space's side nav is shown: as the page itself, or embedded beside
 * another page. Each role keeps its own selection.
 */
export type SpaceSideNavRole = "page" | "embedded";

const selections = new Map<string, SpaceSelection>();

function selectionKey(spaceId: string, role: SpaceSideNavRole) {
  return `${role}\u0000${spaceId}`;
}

/**
 * Selection last shown for a space in the given role in this session, such as
 * before the space was replaced by one of its items in full screen and then
 * minimized back.
 */
export function readSpaceSelection(spaceId: string, role: SpaceSideNavRole) {
  return selections.get(selectionKey(spaceId, role));
}

export function rememberSpaceSelection(
  spaceId: string,
  role: SpaceSideNavRole,
  selection: SpaceSelection
) {
  selections.set(selectionKey(spaceId, role), { ...selection });
}

/** Forgets every remembered selection, such as between tests. */
export function clearSpaceSelections() {
  selections.clear();
}
