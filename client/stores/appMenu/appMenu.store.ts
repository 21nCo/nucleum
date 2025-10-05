import { KeyValueStore } from "$lib/client/components/flux/resourceStores/kv.store";
import type { IAppMenuStore } from "./appMenu.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { appStore } from "$lib/client/stores/app.store";
import { get } from "svelte/store";
import { logger } from "$lib/client/components/debug/logger.client";

class AppMenuStore extends KeyValueStore<IAppMenuStore> {
  constructor() {
    super(Resource.appMenu, {});
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
