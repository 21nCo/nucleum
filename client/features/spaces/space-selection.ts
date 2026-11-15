/** The item a space's side nav shows, kept while the side nav remounts. */
export type SpaceSelection = {
  selectedItemId: string | null;
  /** The user closed the item, so the space shows its empty panel. */
  isClosedByUser: boolean;
};

const selections = new Map<string, SpaceSelection>();

/**
 * Selection last shown for a space in this session, such as before the space
 * was replaced by one of its items in full screen and then minimized back.
 */
export function readSpaceSelection(spaceId: string) {
  return selections.get(spaceId);
}

export function rememberSpaceSelection(
  spaceId: string,
  selection: SpaceSelection
) {
  selections.set(spaceId, { ...selection });
}

/** Forgets every remembered selection, such as between tests. */
export function clearSpaceSelections() {
  selections.clear();
}
