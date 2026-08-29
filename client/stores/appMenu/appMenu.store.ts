import type { IAppMenuStore } from "@21n/stores/appMenu/appMenu.type";
import { Resource } from "@21n/data/datafn/resource.enum";
import { appStore } from "@21n/stores/app.store";
import { get, writable } from "svelte/store";
import { logger } from "@21n/components/debug/logger.client";
import { Product } from "@21n/products/product.type";
import { datafn } from "@21n/stores/datafn.store";

const appMenuSignal = datafn.kv.signal<IAppMenuStore>(Resource.appMenu, {
  defaultValue: {}
});
const appMenuLocal = writable<IAppMenuStore>({});

function migrateLegacyNucleusAppMenu(data: IAppMenuStore): IAppMenuStore {
  if (data.nucleus && !data[Product.NUCLEUM]) {
    return {
      ...data,
      [Product.NUCLEUM]: { ...data.nucleus }
    };
  }
  return data;
}

appMenuSignal.subscribe((value) => {
  appMenuLocal.set(migrateLegacyNucleusAppMenu(value ?? {}));
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
  modify(n: Partial<IAppMenuStore>) {
    appMenuLocal.update((current) => ({ ...current, ...n }) as IAppMenuStore);
    return datafn.kv.merge(Resource.appMenu, n);
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
