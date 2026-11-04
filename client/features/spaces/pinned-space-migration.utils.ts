import { Resource } from "@nucleum/datafn/resource.enum";
import type { Product } from "@nucleum/client/config/product.type";
import {
  determineResourceType,
  isRecordId
} from "@nucleum/datafn/resource.utils";
import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
import {
  SpaceNavItemType,
  type ISpaceNavItem
} from "@nucleum/features/spaces/space.type";
import {
  collectPageItems,
  collectResourceItems,
  isSpaceItemOpenable,
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
 * Items to append to the pinned space: app tabs in tab order, as record items or as
 * page links for page tabs, then former resource-type pins as page links in pin
 * order. Skips tabs whose record or page is missing, the space itself, and anything
 * already in the space or earlier in the list, so planning again after the items
 * were added returns nothing.
 */
export function planPinnedSpaceItems(params: {
  items: ISpaceNavItem[];
  spaceId?: string;
  tabIds: string[];
  records: Record<string, PinnedSpaceRecord | undefined>;
  tabPages?: Record<string, PinnedSpacePage | undefined>;
  pages: PinnedSpacePage[];
  createId: () => string;
}): ISpaceNavItem[] {
  const { items, spaceId, tabIds, records, tabPages, pages, createId } = params;
  const resourceIds = new Set(
    collectResourceItems(items).map((item) => item.resourceId.toString())
  );
  const paths = new Set(
    collectPageItems(items).map((item) => normalizeSpacePagePath(item.path))
  );
  const planned: ISpaceNavItem[] = [];
  const addPage = (page: PinnedSpacePage) => {
    const path = normalizeSpacePagePath(page.path);
    if (!path || paths.has(path)) return;
    paths.add(path);
    planned.push({
      id: createId(),
      type: SpaceNavItemType.PAGE,
      label: page.label,
      path
    });
  };
  for (const tabId of tabIds ?? []) {
    const id = tabId?.toString();
    if (!id) continue;
    const record = records[id];
    if (!record) {
      const page = tabPages?.[id];
      if (page) addPage(page);
      continue;
    }
    if (id === spaceId || resourceIds.has(id)) continue;
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
  for (const page of pages ?? []) addPage(page);
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
 * tabs as moved, and pins the space when `isPinning` is set or an earlier run
 * created it without finishing the pin. Clears that pending pin.
 */
export function planPinnedSpaceMenu<
  T extends {
    user?: string[];
    spaces?: string[];
    pinnedSpaceId?: string;
    tabsMigrated?: boolean;
    pinnedSpacePinPending?: boolean;
  }
>(params: {
  menu: T;
  movedPins: string[];
  spaceId?: string;
  isPinning: boolean;
}): T {
  const { menu, movedPins, spaceId } = params;
  const { pinnedSpacePinPending, ...rest } = menu;
  const isPinning = params.isPinning || Boolean(pinnedSpacePinPending);
  const spaces = menu.spaces ?? [];
  return {
    ...(rest as T),
    user: (menu.user ?? []).filter((pin) => !movedPins.includes(pin)),
    tabsMigrated: true,
    ...(spaceId ? { pinnedSpaceId: spaceId } : {}),
    ...(spaceId && isPinning && !spaces.includes(spaceId)
      ? { spaces: [...spaces, spaceId] }
      : {})
  };
}

/**
 * Tabs a migration run may remove from the tab bar: tabs whose record or page is
 * now in the space, and tabs whose record is known to be trashed. Tabs whose record
 * or page could not be found stay in the tab bar, since the record may not have
 * reached this device yet.
 */
export function resolveMovedTabs(params: {
  tabIds: string[];
  records: Record<string, PinnedSpaceRecord | undefined>;
  tabPages: Record<string, PinnedSpacePage | undefined>;
  trashedIds: Set<string>;
}) {
  const { tabIds, records, tabPages, trashedIds } = params;
  return tabIds.filter(
    (id) => Boolean(records[id] || tabPages[id]) || trashedIds.has(id)
  );
}

/** Tab ids left after removing the tabs a migration run moved. */
export function removeMovedTabs<T>(tabIds: T[], movedTabIds: string[]): T[] {
  const moved = new Set(movedTabIds);
  return tabIds.filter((id) => !moved.has(String(id ?? "")));
}

/**
 * Splits app tabs into those the migration handles and those it leaves in the tab
 * bar: record tabs of a type the product cannot open from a space. Handled tabs are
 * moved into the space, or dropped when their record is trashed.
 */
export function partitionPinnedSpaceTabs(params: {
  tabIds: string[];
  product: Product;
}) {
  const movable: string[] = [];
  const kept: string[] = [];
  for (const id of params.tabIds) {
    const resourceType = isRecordId(id)
      ? determineResourceType(id)
      : Resource.unknown;
    const isKept =
      resourceType !== Resource.unknown &&
      !isSpaceItemOpenable(resourceType, params.product);
    (isKept ? kept : movable).push(id);
  }
  return { movable, kept };
}
