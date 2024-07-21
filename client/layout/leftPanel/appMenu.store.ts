import { KeyValueStore } from "$lib/client/components/resourceStores/kv.store";
import type { IAppMenuStore } from "$lib/client/types/appMenu.type";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { appStore } from "$lib/client/stores/app.store";
import { get } from "svelte/store";
import { logger } from "$lib/client/stores/log.store";

class AppMenuStore extends KeyValueStore<IAppMenuStore> {
  constructor() {
    super(
      Resource.appMenu,
      {},
      {
        priorityRefreshOnAppAppear: true,
        isSynchronousCache: true
      }
    );
  }
  setDefaults(data: string[]) {
    const current = this.get();
    const context = get(appStore).product;
    console.log({
      context: "setting app menu defaults",
      current,
      ctx: context,
      data
    });
    this.modify({
      ...current,
      [context]: {
        default: data,
        user: current[context]?.user ?? []
      }
    });
  }
  addUserMenuItem(item: string) {
    const current = this.get();
    const context = get(appStore).product;
    console.log({ context: "adding user app menu item", current });
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
    console.log({ context: "removing user app menu item", current });
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
