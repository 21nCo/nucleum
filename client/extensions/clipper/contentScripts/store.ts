import { nodeStore } from "$lib/client/products/memotron/node/node.store";
import { ObservableStore } from "$lib/client/stores/client.store";
import { KeyValueStore } from "$lib/client/components/resourceStores/kv.store";
import { appEvents } from "$lib/client/stores/notification.store";
import {
  StoreDataType,
  type IObservableStoreSubject
} from "$lib/client/types/data.type";
import { Position } from "$lib/client/types/direction.enum";
import type { TabData } from "$lib/client/types/extension.type";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import {
  ClipperExtensionEvent,
  type TextHighlightContent,
  type VideoTimestampContent
} from "$lib/client/products/memotron/common/clip.type";
import { AlertType } from "$lib/client/types/notification.type";
import { objIsEmpty, shallowDiff } from "$lib/shared/utils/obj.utils";
import { replaceParams } from "$lib/client/utils/surreal.utils";
import { activeResourceFilter, debouncer } from "$lib/client/utils/utils";
import { ClipperPersistence } from "../clipper.persistence";
import { removeHighlight } from "./highlightV4";
import type { IWebpage } from "./types";

class WebpageStore extends ObservableStore<IWebpage> {
  private persistence = new ClipperPersistence();
  previousValue: string = "";
  constructor() {
    super("clipperContentScriptStore", StoreDataType.NA, {
      refreshOnAppear: true
    });
    this.set({ url: "", clips: [] });
  }
  async loader(data: any) {
    console.log("loader", data);
    const page = data.page;
    if (page) {
      this.update((n) => {
        n.id = page.id;
        n.clips =
          page.clips?.length > 0 ? page.clips.filter(activeResourceFilter) : [];
        n.links = page.links;
        n.notes = page.notes;
        return n;
      });
      appEvents.publish(ClipperExtensionEvent.CLIPS_CHANGED);
    }
  }
  resolveRefreshQuery() {
    let url = this.get().url;
    if (!url) {
      url = window.location.href;
    }
    return replaceParams("return fn::memotron::clipper::fetchPage($url)", {
      url
    });
  }
  /**
  * when a tab is changed, this method is called to update the store with the new tab data.

  TODO - whether to refresh or not - when a tab is changed, the content script is reinjected, and therefore the store is refreshed from dataManager refreshApp.
  * @param tab
  * @returns
  */
  onContextChange(tab: chrome.tabs.Tab) {
    // console.log("onContextChange", tab);
    const url = tab.url;
    if (url === this.get().url) return;
    this.set({ url, clips: [] });
    // this.refresh();
  }

  /**
   * TODO - save web page via NodeStore - to update nodes local cache
   * @param data
   * @returns
   */
  async savePage(data: any) {
    const response = await this.persistence.saveWebpage(data);
    //TODO - add this to local node cache?
    if (!response?.id) return;
    this.update((n) => {
      n.id = response.id;
      return n;
    });
    return response;
  }
  /**
   * TODO - save clip via NodeStore - to update nodes local cache
   * @param data
   * @param tabData
   * @returns
   */
  async saveClip(
    data: TextHighlightContent | VideoTimestampContent,
    tabData?: TabData
  ) {
    const response = await this.persistence.saveClip(data, tabData);
    if (!response?.parent) return;
    this.update((n) => {
      n.clips = [...(n.clips ?? []), response];
      if (n.id) n.id = response.parent;
      return n;
    });
    return response;
  }
  async linkPage(to: string) {
    const isAlreadyLinked = this.get().links?.some((l) => l === to);
    if (isAlreadyLinked)
      return { message: "Already linked", type: AlertType.ERROR };
    const response = await this.persistence.link(this.get().id, to);
    if (!response) return { message: "Linking failed", type: AlertType.ERROR };
    this.update((n) => {
      n.links = [...(n.links ?? []), to];
      return n;
    });
    return { message: "Linked!", type: AlertType.SUCCESS };
  }
  async removeLinkForPage(to: string) {
    const response = await this.persistence.unlink(this.get().id, to);
    if (!response)
      return { message: "Unlinking failed", type: AlertType.ERROR };
    this.update((n) => {
      n.links = n.links?.filter((l) => l !== to);
      return n;
    });
    return { message: "Unlinked!", type: AlertType.SUCCESS };
  }
  async linkClip(from: string, to: string) {
    const clip = this.get().clips.find((c) => c.id === from);
    if (!clip) return;
    const isAlreadyLinked = clip.links?.some((l) => l === to);
    if (isAlreadyLinked)
      return { message: "Already linked", type: AlertType.ERROR };
    const response = await this.persistence.link(from, to);
    if (!response) return { message: "Linking failed", type: AlertType.ERROR };
    this.update((n) => {
      n.clips = n.clips.map((c) => {
        if (c.id === from) {
          c.links = [...(c.links ?? []), to];
        }
        return c;
      });
      return n;
    });
    appEvents.publish(ClipperExtensionEvent.CLIPS_CHANGED);
    return { message: "Linked!", type: AlertType.SUCCESS };
  }
  async removeLinkForClip(from: string, to: string) {
    const response = await this.persistence.unlink(from, to);
    if (!response)
      return { message: "Unlinking failed", type: AlertType.ERROR };
    this.update((n) => {
      n.clips = n.clips.map((c) => {
        if (c.id === from) {
          c.links = c.links?.filter((l) => l !== to);
        }
        return c;
      });
      return n;
    });
    appEvents.publish(ClipperExtensionEvent.CLIPS_CHANGED);
    return { message: "Unlinked!", type: AlertType.SUCCESS };
  }
  async removeClip(id: string) {
    const response = await nodeStore.trash(id);
    console.log({ response });
    if (!response)
      return { message: "Clip removal failed", type: AlertType.ERROR };
    this.update((n) => {
      n.clips = n.clips.filter((c) => c.id !== id);
      return n;
    });
    removeHighlight(id);
    return { message: "Clip removed!", type: AlertType.SUCCESS };
  }
  /**
   * If the save page happened from side bar - the toolbar and other content on web page should reflect the change. This method is called to update the store with the new page data when content script receive the message from side bar.
   * @param data ``
   */
  propagatePageStatusFromSidebar(data: any) {
    if (this.get().id === data.id) return;
    this.update((n) => {
      n.id = data.id;
      return n;
    });
  }
  private _persistNotes = async (id: string, notes: string) => {
    return await nodeStore.modify(id, { notes });
  };
  private _debouncedPersistNotes = debouncer(this._persistNotes, 2000);
  set(newValue: IWebpage) {
    let changedProperties: any = {};
    if (this.previousValue) {
      let differences = shallowDiff(newValue, JSON.parse(this.previousValue));
      differences.forEach((key: string) => {
        changedProperties[key] = newValue[key as keyof IWebpage];
      });
    }
    // console.log({
    //   previousValue: this.previousValue ? JSON.parse(this.previousValue) : null,
    //   newValue,
    //   changedProperties
    // });
    this._set(newValue);
    this.previousValue = JSON.stringify(newValue);
    if (!objIsEmpty(changedProperties) && changedProperties.notes) {
      this._debouncedPersistNotes(newValue.id, newValue.notes);
    }
  }
  persistClipNotes(id: string, notes: string) {
    return this._debouncedPersistNotes(id, notes);
  }
}
export const webpage = new WebpageStore();

class ClipperToolbarState extends KeyValueStore<
  {
    isOpen: boolean;
    position: Position.Right | Position.Left | Position.Bottom;
  } & IObservableStoreSubject
> {
  constructor() {
    super(
      Resource.clipperToolbarState,
      { isOpen: true, position: Position.Right },
      {
        refreshOnAppear: true
      }
    );
  }
  toggle(isOpen?: boolean) {
    if (isOpen === undefined) {
      isOpen = !this.get().isOpen;
    }
    this.modify({ isOpen });
    if (isOpen) {
      setTimeout(() => {
        webpage.refresh();
      }, 100);
    }
  }
  changePosition(position: Position.Right | Position.Left | Position.Bottom) {
    this.modify({ position });
  }
}

export const toolbarState = new ClipperToolbarState();
