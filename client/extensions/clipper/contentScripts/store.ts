import { nodeStore } from "$lib/client/products/memotron/node/node.store";
import { ObservableStore } from "$lib/client/stores/client.store";
import { KeyValueStore } from "$lib/client/components/resourceStores/kv.store";
import { appEvents } from "$lib/client/stores/notification.store";
import {
  StoreDataType,
  type IObservableStoreSubject
} from "$lib/client/types/data.type";
import { Position } from "$lib/client/types/direction.enum";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import {
  ClipperExtensionEvent
} from "$lib/client/products/memotron/common/clip.type";
import { AlertType } from "$lib/client/types/notification.type";
import { objIsEmpty, shallowDiff } from "$lib/shared/utils/obj.utils";
import { replaceParams } from "$lib/client/utils/surreal.utils";
import { activeResourceFilter, debouncer } from "$lib/client/utils/utils";
import { removeHighlight } from "./highlightV4";
import type { IFeedbackPaneStore, IWebpage } from "./types";
import { linker } from "$lib/client/products/memotron/memotron.store";
import { NodeIdPrefix, NodeType, type IClip, type IClipCapture, type ITweet, type ITwitterProfile, type IWebPage, type IWebScreenshotClip } from "$lib/client/products/memotron/node/node.type";
import { generateResourceId } from "$lib/shared/utils/text.utils";
import { extractFullTabData, resolveUrl } from "../clipper.utils";
import type { IResourceCapture } from "$lib/client/components/resourceStores/resource.type";
import { logger } from "$lib/client/components/debug/logger.client";
import { ExtensionEvent } from "$lib/client/types/extension.type";
import { relayToSidePanel } from "$lib/client/utils/extension.utils";

class WebpageStore extends ObservableStore<IWebpage> {
  previousValue: string = "";
  constructor() {
    super("clipperContentScriptStore", StoreDataType.NA, {
      refreshOnAppear: false
    });
    this.set({ url: "", clips: [] });
  }
  async loader(data: any) {
    logger.log({ at: "webpage loader", data });
    const page = data.page;
    this.update((n) => {
      n.id = page?.id;
      n.clips =
        page?.clips?.length > 0 ? page.clips.filter(activeResourceFilter) : [];
      n.links = page?.links ?? [];
      n.notes = page?.notes ?? "";
      return n;
    });
    appEvents.publish(ClipperExtensionEvent.REFRESH_CLIPS_RENDERING);
    relayToSidePanel({ event: ExtensionEvent.PAGE_STATE, data: this.get() });
  }
  resolveRefreshQuery() {
    let url = this.get().url;
    if (!url) {
      url = resolveUrl();
    }
    logger.log({ at: "resolveRefreshQuery", url, thisgeturl: this.get().url });
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
    const url = resolveUrl(tab.url);
    logger.log({ at: "onContextChange", url });
    if (url === this.get().url) return;
    this.set({ url, clips: [] });
    feedbackPane.reset();
    this.refresh();
  }

  /**
   * @param data - tab data
   * @returns
   */
  async savePage(data: IResourceCapture<IWebPage>, creationContext?: string) {
    const id = generateResourceId(Resource.node);
    const node = {
      id,
      ...data,
      creationContext,
      contentType: NodeType.WEB_PAGE,
    }
    const response = await nodeStore.createNode([ node ], {
      isUseQueueFirstApproach: true,
      mutationId: `${this.id}-saveWebpage`
    });
    this.update((n) => {
      n.id = id;
      return n;
    });
    relayToSidePanel({ event: ExtensionEvent.PAGE_STATE, data: node });
    return id;
  }
  /**
   * Saves the clip to the database. If the webpage is not saved, it will be saved first by parsing the DOM for web page metadata.
   * 
   * Note: This method will not work if called from non content script context as parsing the DOM is not possible.
   * @param data
   * @param tabData
   * @returns
   */
  async saveClip(
    data: IClipCapture
  ) {
    let webpage = this.get();
    logger.log({ at: "saveClip", webpage, data });
    const id = generateResourceId(Resource.node);
    if (!webpage.id) {
      const tabData = extractFullTabData();
      await this.savePage(tabData, id);
    }
    webpage = this.get();
    const clip = {
      id,
      body: {
        ...data.body,
        url: (webpage.url ?? window.location.href ) + "#" + id
      },
      metadata: data.metadata,
      parent: webpage.id,
      contentType: data.contentType,
      label: undefined
    }
    const response = await nodeStore.createNode([clip],
      {
        isUseQueueFirstApproach: true,
        mutationId: `${this.id}-saveClip`
      });
    if (!response) return;
    const clipNode = response.resources[0] as IWebScreenshotClip;
    this.update((n) => {
      n.clips = [...(n.clips ?? []), clipNode];
      return n;
    });
    if (clip.contentType === NodeType.WEB_SCREENSHOT_CLIP) { 
      feedbackPane.focus(clipNode, "Clip saved!");
    }
    return clip;
  }
  async saveTweet(data: IClipCapture<ITweet & {
    username: string;
    profileUrl: string;
    authorName: string;
    profileImageUrl: string;
  }>, isFromTweetPage: boolean = false) { 
    logger.log({ at: "saveTweet", data });
    const id = generateResourceId(Resource.node);
    const twitterProfileId = generateResourceId(Resource.node, {prefix: NodeIdPrefix.TWITTER_PROFILE, id: data.username})
    const tweetNode: IClipCapture<ITweet> & { id: string } = {
      id,
      body: data.body,
      metadata: data.metadata,
      parent: twitterProfileId,
      contentType: NodeType.TWEET,
    };
    const twitterProfileNode: IClipCapture<ITwitterProfile> = {
      body: {
        url: data.profileUrl,
        name: data.authorName,
        profileImageUrl: data.profileImageUrl
      },
      metadata: {},
      contentType: NodeType.TWITTER_PROFILE
    }
    const response = await nodeStore.createNode([
      { ...tweetNode, label: undefined },
      { ...twitterProfileNode, id: twitterProfileId, label: undefined, creationContext: id }
    ], {
      isUseQueueFirstApproach: true,
      mutationId: `${this.id}-saveTweet`
    });
    if (!response) return;
    const tweet = response.resources[0] as ITweet;
    this.update((n) => {
      n.clips = [...(n.clips ?? []), tweet];
      if (isFromTweetPage) n.id = tweet.id;
      return n;
    });
    feedbackPane.focus(tweet, "Tweet saved!");
    return tweetNode;
  }

  /**
   * Triggers from twitter profile page.
   * @param data 
   * @returns 
   */
  async saveTwitterProfile(data: IClipCapture<ITwitterProfile & { username: string}>) { 
    const twitterProfileId = generateResourceId(Resource.node, { prefix: NodeIdPrefix.TWITTER_PROFILE, id: data.username })
    logger.log({ at: "saveTwitterProfile", data, twitterProfileId });
    const response = await nodeStore.createNode([
      { ...data, id: twitterProfileId, label: undefined }
    ], {
      isUseQueueFirstApproach: true,
      mutationId: `${this.id}-saveTwitterProfile`
    });
    if (!response) return;
    const node = response.resources[0] as ITwitterProfile;
    this.update((n) => {
      n.clips = [...(n.clips ?? []), node];
      n.id = node.id;
      return n;
    });
    feedbackPane.focus(node, "Twitter profile saved!");
    return node;
  }
  async linkPage(to: string) {
    const isAlreadyLinked = this.get().links?.some((l) => l === to);
    if (isAlreadyLinked)
      return { message: "Already linked", type: AlertType.ERROR };
    const response = await linker.link(this.get().id, to);
    if (!response) return { message: "Linking failed", type: AlertType.ERROR };
    this.update((n) => {
      n.links = [...(n.links ?? []), to];
      return n;
    });
    return { message: "Linked!", type: AlertType.SUCCESS };
  }
  async removeLinkForPage(to: string) {
    const response = await linker.unlink(this.get().id, to);
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
    const response = await linker.link(from, to);
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
    appEvents.publish(ClipperExtensionEvent.REFRESH_CLIPS_RENDERING);
    return { message: "Linked!", type: AlertType.SUCCESS };
  }
  async removeLinkForClip(from: string, to: string) {
    const response = await linker.unlink(from, to);
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
    appEvents.publish(ClipperExtensionEvent.REFRESH_CLIPS_RENDERING);
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
   * 
   * @deprecated - using content script as main source of state. save page event from side panel is now relayed to content script.
   * 
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
  async persistClipNotes(id: string, notes: string) {
    return new Promise((resolve) => {
      const result = this._debouncedPersistNotes(id, notes);
        resolve(result);
    });
  }
}
export const webpage = new WebpageStore();


class FeedbackPaneStore extends ObservableStore<IFeedbackPaneStore> { 
  constructor() {
    super("feedbackPane",);
    this.set({ isShown: false, feedback: "", focusedClip: null });
  }
  reset() {
    this.update(() => {
      return { isShown: false, feedback: "", focusedClip: null };
    });
  }
  toggle() {
    this.update((n) => {
      n.isShown = !n.isShown;
      return n;
    });
  }
  focus(clip: IClip | null, message: string) {
    this.update((n) => {
      n.focusedClip = clip;
      n.feedback = message;
      n.isShown = true;
      return n;
    });
  }
}

export const feedbackPane = new FeedbackPaneStore();

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
        refreshOnAppear: true,
        dboDependencies: [
          "fn::memotron::clipper::fetchPage",
          "fn::global::utils::resolveUrlParts::v2"
        ]
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
