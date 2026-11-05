import {
  SpaceNavItemType,
  type ISpaceNavItem,
  type ISpaceResourceNavItem,
  type ISpaceSectionNavItem
} from "@nucleum/features/spaces/space.type";

/** A section on the wall: its own records as cards, then its nested sections. */
export type ISpaceWallGroup = {
  section: ISpaceSectionNavItem;
  resources: ISpaceResourceNavItem[];
  groups: ISpaceWallGroup[];
};

/** Records and sections of one level of a space's item tree, in tree order. */
export type ISpaceWallLevel = {
  resources: ISpaceResourceNavItem[];
  groups: ISpaceWallGroup[];
};

/**
 * Splits one level of a space's item tree into the records shown as a card grid
 * and the sections shown as titled groups, recursing into every section.
 */
export function groupWallItems(items?: ISpaceNavItem[]): ISpaceWallLevel {
  const resources: ISpaceResourceNavItem[] = [];
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

/** Number of records inside a wall group, including its nested sections. */
export function countWallGroupResources(group: ISpaceWallGroup): number {
  return group.groups.reduce(
    (total, child) => total + countWallGroupResources(child),
    group.resources.length
  );
}
