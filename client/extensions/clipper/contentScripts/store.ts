import { ObservableStore } from "$lib/client/stores/client.store";
import { KeyValueStore } from "$lib/client/stores/kv.store";
import { StoreDataType, type IObservableStoreSubject } from "$lib/client/types/data.type";
import { Position } from "$lib/client/types/direction.enum";
import { Item } from "$lib/client/types/item.enum";
import { replaceParams } from "$lib/client/utils/surreal.utils";
import { ClipperPersistence } from "../clipper.persistence";
import type { IWebpage } from "./types";

class WebpageStore extends ObservableStore<IWebpage> {
  private persistence = new ClipperPersistence()
  constructor() {
    super("clipperContentScriptStore", StoreDataType.NA, {
      priorityRefreshOnAppAppear: true
    })
    this.set({ url: "", clips: [] })
  }
  async loader(data: any) {
    console.log("loader", data)
    const page = data.page;
    if (page) {
      this.update((n) => {
        n.id = page.id;
        n.clips = page.clips?.length > 0 ? page.clips : [];
        n.links = page.links;
        return n;
      })
    }
  }
  resolveRefreshQuery() {
    let url = this.get().url;
    if (!url) {
      url = window.location.href;
    }
    return replaceParams("return fn::memotron::clipper::fetchPage($url)", { url });
  }
  /**
  * when a tab is changed, this method is called to update the store with the new tab data.

  TODO - whether to refresh or not - when a tab is changed, the content script is reinjected, and therefore the store is refreshed from dataManager.initialize.
  * @param tab
  * @returns
  */
  onContextChange(tab: chrome.tabs.Tab) {
    console.log("onContextChange", tab);
    const url = tab.url;
    if (url === this.get().url) return;
    this.set({ url, clips: [] })
    // this.refresh();
  }
  async savePage(data: any) {
    const response = await this.persistence.saveWebpage(data);
    //TODO - add this to local node cache?
    if (!response?.id) return;
    this.update((n) => {
      n.id = response.id;
      return n;
    })
    return response;
  }
  async linkPage(to: string) {
    const response = await this.persistence.link(this.get().id, to);
    if (response) {
      this.update((n) => {
        n.links = [...n.links ?? [], to];
        return n;
      })
    }
    return response;
  }
  async removeLinkForPage(to: string) { 
    const response = await this.persistence.unlink(this.get().id, to);
    if (response) {
      this.update((n) => {
        n.links = n.links?.filter((l) => l !== to);
        return n;
      })
    }
    return response;
  }
  async linkClip(from: string, to: string) {
    const response = await this.persistence.link(from, to);
    if (response) {
      this.update((n) => {
        n.clips = n.clips.map((c) => {
          if (c.id === from) {
            c.links = [...c.links ?? [], to];
          }
          return c;
        });
        return n;
      })
    }
    return response;
  }
  /**
  * If the save page happened from side bar - the toolbar and other content on web page should reflect the change. This method is called to update the store with the new page data when content script receive the message from side bar.
  * @param data ``
  */
  propagatePageStatusFromSidebar(data: any) {
    this.update((n) => {
      n.id = data.id;
      return n;
    })
  }
}
export const webpage = new WebpageStore();


class ClipperToolbarState extends KeyValueStore<{ isOpen: boolean, position: Position.Right | Position.Left | Position.Bottom } & IObservableStoreSubject> {
  constructor() {
    super(Item.clipperToolbarState, { isOpen: true, position: Position.Right }, {
      priorityRefreshOnAppAppear: true
    });
  } 
  toggle(isOpen?: boolean) {
    if (isOpen === undefined) {
      isOpen = !this.get().isOpen;
    }
    this.modify({ isOpen })
    if (isOpen) {
      setTimeout(() => {
        webpage.refresh();
      }, 100);
    }
  }
  changePosition(position: Position.Right | Position.Left | Position.Bottom) {
    this.modify({ position })
  }
}

export const toolbarState = new ClipperToolbarState();
