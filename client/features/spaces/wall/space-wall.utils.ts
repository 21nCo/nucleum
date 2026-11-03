import {
  SpaceNavItemType,
  type ISpaceLeafNavItem,
  type ISpaceNavItem,
  type ISpaceSectionNavItem
} from "@nucleum/features/spaces/space.type";

/** A section on the wall: its own records and page links as cards, then its nested sections. */
export type ISpaceWallGroup = {
  section: ISpaceSectionNavItem;
  resources: ISpaceLeafNavItem[];
  groups: ISpaceWallGroup[];
};

/** Cards and sections of one level of a space's item tree, in tree order. */
export type ISpaceWallLevel = {
  resources: ISpaceLeafNavItem[];
  groups: ISpaceWallGroup[];
};

/**
 * Splits one level of a space's item tree into the records and page links shown as a card grid
 * and the sections shown as titled groups, recursing into every section.
 */
export function groupWallItems(items: ISpaceNavItem[] = []): ISpaceWallLevel {
  const resources: ISpaceLeafNavItem[] = [];
  const groups: ISpaceWallGroup[] = [];
  for (const item of items ?? []) {
    if (item.type === SpaceNavItemType.SECTION) {
      groups.push({ section: item, ...groupWallItems(item.children) });
    } else {
      resources.push(item);
    }
  }
  return { resources, groups };
}

/** Number of cards inside a wall group, including its nested sections. */
export function countWallGroupResources(group: ISpaceWallGroup): number {
  return group.groups.reduce(
    (total, child) => total + countWallGroupResources(child),
    group.resources.length
  );
}
