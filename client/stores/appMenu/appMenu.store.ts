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
  setDefaults(
    data: {
      all: string[];
      mobile: string[];
    },
    isPersist: boolean = false
  ) {
    const current = this.get();
    const context = get(appStore).product;
    logger.log({
      context: "setting app menu defaults",
      current,
      ctx: context,
      data
    });
    this.modify(
      {
        ...current,
        [context]: {
          default: data.all,
          mobile: data.mobile,
          user: current[context]?.user ?? []
        }
      },
      {
        isPersist
      }
    );
    this.seed = this.get();
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

export const appMenuStore = new AppMenuStore();
