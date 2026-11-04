import { get } from "svelte/store";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
import { ActionType } from "@nucleum/client/config/action.type";
import type { Product } from "@nucleum/client/config/product.type";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { datafn } from "@nucleum/datafn/datafn.store";
import { generateResourceId } from "@nucleum/datafn/id.utils";
import { assertDatafnMutationSucceeded } from "@nucleum/datafn/mutation.utils";
import { Resource } from "@nucleum/datafn/resource.enum";
import {
  determineResourceType,
  isRecordId,
  isTrashedResource
} from "@nucleum/datafn/resource.utils";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { appMenuStore } from "@nucleum/shell/navigation/app-menu.store";
import type { IAppMenu } from "@nucleum/shell/navigation/app-menu.type";
import { tabs } from "@nucleum/shell/topNav/tabs/tabs.store";
import type {
  ISpace,
  ISpaceNavItem
} from "@nucleum/features/spaces/space.type";
import {
  appendSpaceItems,
  insertSpace,
  reloadActiveSpace
} from "@nucleum/features/spaces/space.store";
import {
  hasEquivalentNavItem,
  resolveSpacePageRoute,
  resolveTargetLabel
} from "@nucleum/features/spaces/space.utils";
import {
  PINNED_SPACE_LABEL,
  hasPinnedSpaceSources,
  partitionPinnedSpaceTabs,
  planPinnedSpaceItems,
  planPinnedSpaceMenu,
  removeMovedTabs,
  resolveMovedTabs,
  type PinnedSpacePage,
  type PinnedSpaceRecord
} from "@nucleum/features/spaces/pinned-space-migration.utils";

const recordMetadata = { includeTrashed: true, includeArchived: true };
const inFlight = new Map<string, Promise<void>>();

/** Maps a pinned resource type to the page it opens, or undefined to drop it. */
type TypePinPageResolver = (pin: string) => PinnedSpacePage | undefined;

type MigrationScope = { namespace: string; product: Product };

class StaleMigrationError extends Error {}

function assertCurrent(scope: MigrationScope) {
  if (datafn.currentNamespace() !== scope.namespace) {
    throw new StaleMigrationError("DataFn namespace changed");
  }
}

async function readMenu(scope: MigrationScope): Promise<IAppMenu> {
  const menus = await appMenuStore.read();
  assertCurrent(scope);
  return menus[scope.product] ?? {};
}

async function writeMenu(scope: MigrationScope, menu: IAppMenu) {
  assertCurrent(scope);
  const result = await appMenuStore.modify({
    [scope.product]: { ...menu }
  });
  assertDatafnMutationSucceeded(result);
}

/**
 * Loads the recorded pinned space. `isUnavailable` is set when the space is recorded
 * but its record is not on this device, which happens while it has not synced yet.
 */
async function loadPinnedSpace(spaceId: string | undefined) {
  if (!spaceId) {
    return { id: undefined, space: undefined, isUnavailable: false };
  }
  const space = (await datafn.space.select(spaceId, {
    metadata: recordMetadata
  })) as ISpace | undefined;
  if (!space) return { id: spaceId, space: undefined, isUnavailable: true };
  if (isTrashedResource(space)) {
    return { id: undefined, space: undefined, isUnavailable: false };
  }
  return { id: spaceId, space, isUnavailable: false };
}

/** Whether the saved space holds every one of `items`, wherever they were moved. */
async function hasSavedItems(spaceId: string, items: ISpaceNavItem[]) {
  const saved = (await datafn.space.select(spaceId, {
    metadata: recordMetadata
  })) as ISpace | undefined;
  const savedItems = saved?.items ?? [];
  return items.every((item) => hasEquivalentNavItem(savedItems, item));
}

async function loadTabRecord(
  id: string
): Promise<{ record?: PinnedSpaceRecord; isTrashed: boolean }> {
  const resourceType = determineResourceType(id);
  if (resourceType === Resource.unknown) return { isTrashed: false };
  const record = (await datafn.table(resourceType).select(id, {
    metadata: recordMetadata
  })) as Record<string, unknown> | undefined;
  if (!record) return { isTrashed: false };
  if (isTrashedResource(record)) return { isTrashed: true };
  return {
    record: {
      resourceType,
      label: resolveTargetLabel(record),
      avatar: record.avatar as IAvatar | undefined
    },
    isTrashed: false
  };
}

function resolveTabPage(slug: string): PinnedSpacePage | undefined {
  const action = (get(appStore).actions ?? []).find(
    (candidate) =>
      candidate.action === slug && candidate.type === ActionType.PAGE
  );
  if (!action) return undefined;
  const path = action.path ?? action.action;
  return { path, label: action.label ?? path };
}

function resolvePinPage(
  pin: string,
  resolveTypePinPage: TypePinPageResolver
): PinnedSpacePage | undefined {
  const page = resolveTypePinPage(pin);
  if (!page) return undefined;
  const route = resolveSpacePageRoute(get(appStore).actions ?? [], page.path);
  return { path: page.path, label: route?.label ?? page.label };
}

async function runMigration(
  scope: MigrationScope,
  resolveTypePinPage: TypePinPageResolver
) {
  const [menu, storedTabs] = await Promise.all([readMenu(scope), tabs.read()]);
  assertCurrent(scope);
  const typePins = menu.user ?? [];
  const { movable: tabEntries } = partitionPinnedSpaceTabs({
    tabIds: menu.tabsMigrated
      ? []
      : storedTabs.map((id) => id?.toString()).filter(Boolean),
    product: scope.product
  });
  if (!hasPinnedSpaceSources({ tabIds: tabEntries, typePins })) {
    if (!menu.tabsMigrated || menu.pinnedSpacePinPending) {
      const { space, isUnavailable } = await loadPinnedSpace(
        menu.pinnedSpaceId
      );
      if (isUnavailable) {
        if (!menu.tabsMigrated) {
          await writeMenu(scope, {
            ...(await readMenu(scope)),
            tabsMigrated: true
          });
        }
        return;
      }
      await writeMenu(
        scope,
        planPinnedSpaceMenu({
          menu: await readMenu(scope),
          movedPins: [],
          spaceId: space?.id?.toString(),
          isPinning: false
        })
      );
    }
    return;
  }

  const loaded = await Promise.all(
    tabEntries
      .filter((id) => isRecordId(id))
      .map(async (id) => [id, await loadTabRecord(id)] as const)
  );
  const records = Object.fromEntries(
    loaded.map(([id, result]) => [id, result.record])
  );
  const trashedIds = new Set(
    loaded.filter(([, result]) => result.isTrashed).map(([id]) => id)
  );
  const tabPages = Object.fromEntries(
    tabEntries
      .filter((id) => !isRecordId(id))
      .map((id) => [id, resolveTabPage(id)])
  );
  const pages = typePins
    .map((pin) => resolvePinPage(pin, resolveTypePinPage))
    .filter((page): page is PinnedSpacePage => Boolean(page));
  const movedTabs = resolveMovedTabs({
    tabIds: tabEntries,
    records,
    tabPages,
    trashedIds
  });

  const pinned = await loadPinnedSpace(menu.pinnedSpaceId);
  assertCurrent(scope);
  if (pinned.isUnavailable && !menu.pinnedSpacePinPending) return;
  const { space } = pinned;
  const added = planPinnedSpaceItems({
    items: space?.items ?? [],
    spaceId: space?.id?.toString(),
    tabIds: tabEntries,
    records,
    tabPages,
    pages,
    createId: generateSimpleRandomId
  });

  let spaceId = space?.id?.toString();
  const isCreating = !space && added.length > 0;
  if (isCreating) {
    spaceId = pinned.id ?? generateResourceId(Resource.space).toString();
    if (spaceId !== menu.pinnedSpaceId || !menu.pinnedSpacePinPending) {
      await writeMenu(scope, {
        ...(await readMenu(scope)),
        pinnedSpaceId: spaceId,
        pinnedSpacePinPending: true
      });
    }
    assertCurrent(scope);
    if (
      !(await insertSpace({
        id: spaceId,
        label: PINNED_SPACE_LABEL,
        items: added
      }))
    ) {
      return;
    }
    await reloadActiveSpace(spaceId);
  } else if (space && added.length > 0) {
    assertCurrent(scope);
    if (!(await appendSpaceItems(space.id, added))) return;
  }
  if (spaceId && added.length > 0) {
    const isSaved = await hasSavedItems(spaceId, added);
    assertCurrent(scope);
    if (!isSaved) return;
  }

  if (movedTabs.length > 0) {
    const currentTabs = await tabs.read();
    assertCurrent(scope);
    assertDatafnMutationSucceeded(
      await tabs.rearrange(removeMovedTabs(currentTabs, movedTabs))
    );
  }
  await writeMenu(
    scope,
    planPinnedSpaceMenu({
      menu: await readMenu(scope),
      movedPins: typePins,
      spaceId,
      isPinning: isCreating || !menu.tabsMigrated
    })
  );
  logger.log({
    at: "migratePinnedSpace",
    product: scope.product,
    spaceId,
    added: added.length
  });
}

async function runExclusive(key: string, task: () => Promise<void>) {
  const locks = globalThis.navigator?.locks;
  if (!locks) return task();
  await locks.request(`pinned-space-migration:${key}`, () => task());
}

/**
 * Moves the current product's resource-type app menu pins, and once its app tabs,
 * into a "Pinned" space pinned to the app menu, then removes the moved entries from
 * their sources. Tabs for records the product cannot open from a space, and tabs
 * whose record or page cannot be found, stay in the tab bar. Resource-type pins move on every run that finds any, so it is safe
 * to run on every app load once DataFn has loaded the active account. Runs are
 * serialized per account and product across windows, stop when the active account
 * changes, and keep their sources when a read or write fails or when the recorded
 * space has not reached this device yet. Failures are logged
 * and never thrown. `resolveTypePinPage` maps a pinned resource type to the page it
 * opens, with a label used when the product has no such page.
 */
export function migratePinnedSpace(params: {
  resolveTypePinPage: TypePinPageResolver;
}) {
  const namespace = datafn.currentNamespace();
  if (!namespace) return Promise.resolve();
  const scope = { namespace, product: get(appStore).product };
  const key = `${scope.namespace}:${scope.product}`;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const run = runExclusive(key, () =>
    runMigration(scope, params.resolveTypePinPage)
  )
    .catch((error) => {
      if (error instanceof StaleMigrationError) return;
      logger.error({ at: "migratePinnedSpace", error });
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, run);
  return run;
}
