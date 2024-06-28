import { KeyValueStore } from "$lib/client/stores/kv.store";
import type { IAppMenuStore } from "$lib/client/types/appMenu.type";
import { Item } from "$lib/client/types/item.enum";

class AppMenuStore extends KeyValueStore<IAppMenuStore> {
  constructor() {
    super(
      Item.appMenu,
      { menu: {} },
      {
        priorityRefreshOnAppAppear: true,
        isSynchronousCache: true
      }
    );
  }
  loadSeed(context: string, data: string[]) {
    this.modify({ menu: { [context]: data } });
  }
  setDefaults(context: string, data: string[]) {
    const current = this.get();
    if (!current.menu) {
      this.loadSeed(context, data);
    } else if (!current.menu[context]) {
      this.setNewValue({
        ...current,
        menu: { ...current.menu, [context]: data }
      });
    }
  }
}

export const appMenuStore = new AppMenuStore();
