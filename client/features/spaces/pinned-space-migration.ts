import { get } from "svelte/store";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
import { ActionType } from "@nucleum/client/config/action.type";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { datafn } from "@nucleum/datafn/datafn.store";
import { Resource } from "@nucleum/datafn/resource.enum";
import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
import {
  determineResourceType,
  isRecordId,
  isTrashedResource
} from "@nucleum/datafn/resource.utils";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { appMenuStore } from "@nucleum/shell/navigation/app-menu.store";
import { tabs } from "@nucleum/shell/topNav/tabs/tabs.store";
import type { ISpace } from "@nucleum/features/spaces/space.type";
import { insertSpace } from "@nucleum/features/spaces/space.store";
import {
  resolveSpacePageRoute,
  resolveTargetLabel
} from "@nucleum/features/spaces/space.utils";
import {
  PINNED_SPACE_LABEL,
  hasPinnedSpaceSources,
  planPinnedSpaceItems,
  type PinnedSpacePage,
  type PinnedSpaceRecord
} from "@nucleum/features/spaces/pinned-space-migration.utils";

const recordMetadata = { includeTrashed: true, includeArchived: true };
let inFlight: Promise<void> | undefined;

/** Maps a pinned resource type to the page it opens, or undefined to drop it. */
type TypePinPageResolver = (pin: string) => PinnedSpacePage | undefined;

async function loadReusableSpace(spaceId: string | undefined) {
  if (!spaceId) return undefined;
  const space = (await datafn.space.select(spaceId, {
    metadata: recordMetadata
  })) as ISpace | undefined;
  return space && !isTrashedResource(space) ? space : undefined;
}

async function loadTabRecord(
  id: string
): Promise<PinnedSpaceRecord | undefined> {
  const resourceType = determineResourceType(id);
  if (resourceType === Resource.unknown) return undefined;
  try {
    const record = (await datafn.table(resourceType).select(id, {
      metadata: recordMetadata
    })) as Record<string, unknown> | undefined;
    if (!record || isTrashedResource(record)) return undefined;
    return {
      resourceType,
      label: resolveTargetLabel(record),
      avatar: record.avatar as IAvatar | undefined
    };
  } catch (error) {
    logger.error({ at: "migratePinnedSpace.loadTabRecord", error, id });
    return undefined;
  }
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

async function runMigration(resolveTypePinPage: TypePinPageResolver) {
  const product = get(appStore).product;
  const [menus, tabIds] = await Promise.all([appMenuStore.read(), tabs.read()]);
  const menu = menus[product] ?? {};
  const typePins = menu.user ?? [];
  const tabEntries = tabIds.map((id) => id?.toString()).filter(Boolean);
  if (!hasPinnedSpaceSources({ tabIds: tabEntries, typePins })) return;

  const recordIds = tabEntries.filter((id) => isRecordId(id));
  const records = Object.fromEntries(
    await Promise.all(
      recordIds.map(async (id) => [id, await loadTabRecord(id)] as const)
    )
  );
  const pages = [
    ...tabEntries.filter((id) => !isRecordId(id)).map(resolveTabPage),
    ...typePins.map((pin) => resolvePinPage(pin, resolveTypePinPage))
  ].filter((page): page is PinnedSpacePage => Boolean(page));

  const space = await loadReusableSpace(menu.pinnedSpaceId);
  const added = planPinnedSpaceItems({
    items: space?.items ?? [],
    spaceId: space?.id?.toString(),
    tabIds: recordIds,
    records,
    pages,
    createId: generateSimpleRandomId
  });

  let spaceId = space?.id?.toString();
  if (!space && added.length > 0) {
    spaceId = await insertSpace({ label: PINNED_SPACE_LABEL, items: added });
    if (!spaceId) return;
  } else if (space && added.length > 0) {
    await datafn.space.mutate({
      operation: "merge",
      id: space.id.toString(),
      record: { items: [...(space.items ?? []), ...added] },
      context: ResourceAccessPoint.SPACE
    });
  }

  const pinnedSpaces = menu.spaces ?? [];
  const menuResult = await appMenuStore.modify({
    [product]: {
      ...menu,
      user: [],
      ...(spaceId
        ? {
            pinnedSpaceId: spaceId,
            spaces: pinnedSpaces.includes(spaceId)
              ? pinnedSpaces
              : [...pinnedSpaces, spaceId]
          }
        : {})
    }
  });
  if (!menuResult.ok) {
    logger.error({ at: "migratePinnedSpace.appMenu", result: menuResult });
    return;
  }
  if (tabEntries.length > 0) await tabs.rearrange([]);
  logger.log({
    at: "migratePinnedSpace",
    product,
    spaceId,
    added: added.length
  });
}

/**
 * Moves the current product's resource-type app menu pins and app tabs into a
 * "Pinned" space pinned to the app menu, then clears both sources. It only acts
 * when a source still has entries, so it is safe to run on every app load once
 * DataFn has loaded the active account. Failures are logged and never thrown.
 * `resolveTypePinPage` maps a pinned resource type to the page it opens, with a
 * label used when the product has no such page.
 */
export function migratePinnedSpace(params: {
  resolveTypePinPage: TypePinPageResolver;
}) {
  inFlight ??= runMigration(params.resolveTypePinPage)
    .catch((error) => {
      logger.error({ at: "migratePinnedSpace", error });
    })
    .finally(() => {
      inFlight = undefined;
    });
  return inFlight;
}
