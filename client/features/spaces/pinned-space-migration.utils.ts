import type { Resource } from "@nucleum/datafn/resource.enum";
import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
import {
  SpaceNavItemType,
  type ISpaceNavItem
} from "@nucleum/features/spaces/space.type";
import {
  collectPageItems,
  collectResourceItems,
  normalizeSpacePagePath
} from "@nucleum/features/spaces/space.utils";

/** Label of the space that collects former app menu pins and app tabs. */
export const PINNED_SPACE_LABEL = "Pinned";

/** A record a former app tab points to, when it still exists and is not trashed. */
export type PinnedSpaceRecord = {
  resourceType: Resource;
  label?: string;
  avatar?: IAvatar;
};

/** A page that a former resource-type pin opens. */
export type PinnedSpacePage = {
  path: string;
  label: string;
};

/**
 * Items to append to the pinned space: app tabs as record items in tab order, then
 * former resource-type pins as page links in pin order. Skips tabs whose records are
 * missing, the space itself, and anything already in the space or earlier in the
 * list, so planning again after the items were added returns nothing.
 */
export function planPinnedSpaceItems(params: {
  items: ISpaceNavItem[];
  spaceId?: string;
  tabIds: string[];
  records: Record<string, PinnedSpaceRecord | undefined>;
  pages: PinnedSpacePage[];
  createId: () => string;
}): ISpaceNavItem[] {
  const { items, spaceId, tabIds, records, pages, createId } = params;
  const resourceIds = new Set(
    collectResourceItems(items).map((item) => item.resourceId.toString())
  );
  const paths = new Set(
    collectPageItems(items).map((item) => normalizeSpacePagePath(item.path))
  );
  const planned: ISpaceNavItem[] = [];
  for (const tabId of tabIds ?? []) {
    const id = tabId?.toString();
    const record = id ? records[id] : undefined;
    if (!id || !record || id === spaceId || resourceIds.has(id)) continue;
    resourceIds.add(id);
    planned.push({
      id: createId(),
      type: SpaceNavItemType.RESOURCE,
      label: record.label ?? "",
      avatar: record.avatar,
      resourceId: id,
      resourceType: record.resourceType
    });
  }
  for (const page of pages ?? []) {
    const path = normalizeSpacePagePath(page.path);
    if (!path || paths.has(path)) continue;
    paths.add(path);
    planned.push({
      id: createId(),
      type: SpaceNavItemType.PAGE,
      label: page.label,
      path
    });
  }
  return planned;
}

/** Whether a product still has app tabs or resource-type pins left to move. */
export function hasPinnedSpaceSources(params: {
  tabIds?: unknown[];
  typePins?: unknown[];
}) {
  return (params.tabIds?.length ?? 0) > 0 || (params.typePins?.length ?? 0) > 0;
}

/**
 * The product's app menu entry after a migration run, built from the entry read just
 * before writing so changes made while the run was in progress are kept. Removes
 * only the resource-type pins the run moved, records the pinned space, marks app
 * tabs as moved, and pins the space only when `isPinning` is set.
 */
export function planPinnedSpaceMenu<
  T extends {
    user?: string[];
    spaces?: string[];
    pinnedSpaceId?: string;
    tabsMigrated?: boolean;
  }
>(params: {
  menu: T;
  movedPins: string[];
  spaceId?: string;
  isPinning: boolean;
}): T {
  const { menu, movedPins, spaceId, isPinning } = params;
  const spaces = menu.spaces ?? [];
  return {
    ...menu,
    user: (menu.user ?? []).filter((pin) => !movedPins.includes(pin)),
    tabsMigrated: true,
    ...(spaceId ? { pinnedSpaceId: spaceId } : {}),
    ...(spaceId && isPinning && !spaces.includes(spaceId)
      ? { spaces: [...spaces, spaceId] }
      : {})
  };
}

/** Tab ids left after removing the tabs a migration run moved. */
export function removeMovedTabs<T>(tabIds: T[], movedTabIds: string[]): T[] {
  const moved = new Set(movedTabIds);
  return tabIds.filter((id) => !moved.has(String(id ?? "")));
}
