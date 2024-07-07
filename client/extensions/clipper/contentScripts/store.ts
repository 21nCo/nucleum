import { ObservableStore } from "$lib/client/stores/client.store";
import { KeyValueStore } from "$lib/client/stores/kv.store";
import { StoreDataType, type IObservableStoreSubject } from "$lib/client/types/data.type";
import { Position } from "$lib/client/types/direction.enum";
import { Item } from "$lib/client/types/item.enum";
import { ClipperPersistence } from "../clipper.persistence";
import type { IContentScriptStore } from "./types";

class ContentScriptStore extends ObservableStore<IContentScriptStore> {
  private persistence = new ClipperPersistence()
  constructor() {
    super("clipperContentScriptStore", StoreDataType.NA, {
      priorityRefreshOnAppAppear: true
    })
    this.set({ url: "", clips: [] })
  }
  async refresh(url: string | undefined = undefined) {
    const result = await this.persistence.fetchPage(url ?? this.get().url);
    if (!result) return;
    const page = result.page;
    if (page) {
      this.update((n) => {
        n.id = page.id;
        n.clips = page.clips?.length > 0 ? page.clips : [];
        n.links = page.links;
        return n;
      })
      // if (result?.toolbarState?.state) {
      //   toolbarState.set(result.toolbarState.state);
      // }
    }
  }
}
export const store = new ContentScriptStore();


class ClipperToolbarState extends KeyValueStore<{ isOpen: boolean, position: Position.Right | Position.Left | Position.Bottom } & IObservableStoreSubject> {
  constructor() {
    super(Item.clipperToolbarState, { isOpen: true, position: Position.Right }, {
      priorityRefreshOnAppAppear: true
    });
    if (this.get()?.isOpen === undefined) {
      this.modify({ isOpen: true })
    }
  }
  toggle(isOpen?: boolean) {
    if (isOpen === undefined) {
      isOpen = !this.get().isOpen;
    }
    this.modify({ isOpen })
    if (isOpen) {
      setTimeout(() => {
        store.refresh();
      }, 100);
    }
  }
  changePosition(position: Position.Right | Position.Left | Position.Bottom) {
    this.modify({ position })
  }
}

export const toolbarState = new ClipperToolbarState();
