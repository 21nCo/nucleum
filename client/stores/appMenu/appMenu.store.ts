import { KeyValueStore } from "@21n/components/flux/resourceStores/kv.store";
import type { IAppMenuStore } from "@21n/stores/appMenu/appMenu.type";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { appStore } from "@21n/stores/app.store";
import { get } from "svelte/store";
import { logger } from "@21n/components/debug/logger.client";
import { Product } from "@21n/products/product.type";

class AppMenuStore extends KeyValueStore<IAppMenuStore> {
  constructor() {
    super(Resource.appMenu, {});
  }

  loader(data: IAppMenuStore) {
    if (!data || typeof data !== "object") return;
    if (data.nucleus && !data[Product.NUCLEUM]) {
      super.loader({
        ...data,
        [Product.NUCLEUM]: { ...data.nucleus }
      });
      return;
    }
    super.loader(data);
  }

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
  }

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
  }
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
  }
}

export const appMenuStore = AppMenuStore.resolve(Resource.appMenu);
