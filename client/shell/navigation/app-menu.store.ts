import type {
  IAppMenu,
  IAppMenuStore
} from "@nucleum/shell/navigation/app-menu.type";
import { Resource } from "@nucleum/datafn/resource.enum";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { get, writable } from "svelte/store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { Product } from "@nucleum/client/config/product.type";
import { datafn } from "@nucleum/datafn/datafn.store";
import {
  acknowledgeOptimisticKvEntries,
  addOptimisticKvEntries,
  applyOptimisticKvEntries,
  removeOptimisticKvEntries
} from "@nucleum/datafn/optimisticKv.utils";
import type { OptimisticKvEntries } from "@nucleum/datafn/optimisticKv.type";

const appMenuSignal = datafn.kv.signal<IAppMenuStore>(Resource.appMenu, {
  defaultValue: {}
});
const appMenuLocal = writable<IAppMenuStore>({});
const pendingAppMenuValues: OptimisticKvEntries = new Map();
let appMenuNamespace = datafn.currentNamespace();

function uniqueStrings(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return [
    ...new Set(
      value.filter(
        (entry): entry is string => typeof entry === "string" && entry !== ""
      )
    )
  ];
}

function normalizeMenu(menu: unknown): IAppMenu {
  if (!menu || typeof menu !== "object") return {};
  const source = menu as Record<string, unknown>;
  const normalized: IAppMenu = { ...(source as IAppMenu) };
  for (const key of ["default", "mobile", "user", "spaces"] as const) {
    const list = uniqueStrings(source[key]);
    if (list) normalized[key] = list;
    else delete normalized[key];
  }
  return normalized;
}

/**
 * Normalizes the stored app menu: carries the legacy `nucleus` key over to the
 * Nucleum product key and drops malformed or duplicate menu entries.
 */
function migrateLegacyNucleusAppMenu(data: IAppMenuStore): IAppMenuStore {
  const source =
    data.nucleus && !data[Product.NUCLEUM]
      ? { ...data, [Product.NUCLEUM]: { ...data.nucleus } }
      : data;
  return Object.fromEntries(
    Object.entries(source).map(([product, menu]) => [
      product,
      normalizeMenu(menu)
    ])
  );
}

appMenuSignal.subscribe((value) => {
  const namespace = datafn.currentNamespace();
  if (namespace !== appMenuNamespace) {
    pendingAppMenuValues.clear();
    appMenuNamespace = namespace;
  }
  const migrated = migrateLegacyNucleusAppMenu(value ?? {});
  acknowledgeOptimisticKvEntries(pendingAppMenuValues, migrated);
  appMenuLocal.set(applyOptimisticKvEntries(migrated, pendingAppMenuValues));
});

export const appMenuStore = {
  subscribe: appMenuLocal.subscribe,
  get() {
    return get(appMenuLocal);
  },
  setUserMenuItems(items: string[]) {
    const current = this.get();
    const context = get(appStore).product;
    logger.log({ context: "setting user app menu items", current });
    this.modify({
      ...current,
      [context]: {
        ...current[context],
        user: items
      }
    });
  },

  addUserMenuItem(item: string) {
    const current = this.get();
    const context = get(appStore).product;
    logger.log({ context: "adding user app menu item", current });
    if (current[context]?.user?.includes(item)) return;
    this.modify({
      ...current,
      [context]: {
        ...current[context],
        user: [...(current[context]?.user ?? []), item]
      }
    });
  },
  removeUserMenuItem(item: string) {
    const current = this.get();
    const context = get(appStore).product;
    logger.log({ context: "removing user app menu item", current });
    if (!current[context]?.user?.includes(item)) return;
    this.modify({
      ...current,
      [context]: {
        ...current[context],
        user: current[context]?.user?.filter((x) => x != item)
      }
    });
  },
  /** Space ids pinned to the current product's app menu. */
  pinnedSpaces(menu?: IAppMenuStore): string[] {
    return (menu ?? get(appMenuLocal))[get(appStore).product]?.spaces ?? [];
  },
  isSpacePinned(spaceId: string, menu?: IAppMenuStore): boolean {
    return appMenuStore.pinnedSpaces(menu).includes(spaceId);
  },
  /** Pins a space to the end of the current product's app menu. */
  pinSpace(spaceId: string) {
    if (!spaceId || this.isSpacePinned(spaceId)) return;
    this.setPinnedSpaces([...this.pinnedSpaces(), spaceId]);
  },
  unpinSpace(spaceId: string) {
    if (!this.isSpacePinned(spaceId)) return;
    this.setPinnedSpaces(this.pinnedSpaces().filter((id) => id !== spaceId));
  },
  setPinnedSpaces(spaceIds: string[]) {
    const current = this.get();
    const context = get(appStore).product;
    return this.modify({
      ...current,
      [context]: {
        ...current[context],
        spaces: uniqueStrings(spaceIds) ?? []
      }
    });
  },
  modify(n: Partial<IAppMenuStore>) {
    const mutationTokens = addOptimisticKvEntries(pendingAppMenuValues, n);
    appMenuLocal.update((current) => ({ ...current, ...n }) as IAppMenuStore);
    const mutation = datafn.kv.merge(Resource.appMenu, n);
    const rollbackPendingValues = () => {
      removeOptimisticKvEntries(pendingAppMenuValues, mutationTokens);
      const current = migrateLegacyNucleusAppMenu(appMenuSignal.get() ?? {});
      appMenuLocal.set(applyOptimisticKvEntries(current, pendingAppMenuValues));
    };
    void mutation.then((result) => {
      if (!result.ok) rollbackPendingValues();
    }, rollbackPendingValues);
    return mutation;
  },
  loader(data: IAppMenuStore) {
    if (!data || typeof data !== "object") return;
    const migrated = migrateLegacyNucleusAppMenu(data);
    appMenuLocal.set(migrated);
    return datafn.kv.set(Resource.appMenu, migrated);
  },
  destroy() {
    appMenuSignal.dispose();
  }
};
