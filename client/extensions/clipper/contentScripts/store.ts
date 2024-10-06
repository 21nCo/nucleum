import { nodeStore } from "$lib/client/products/memotron/node/node.store";
import { ObservableStore } from "$lib/client/stores/client.store";
import { KeyValueStore } from "$lib/client/components/flux/resourceStores/kv.store";
import { appEvents } from "$lib/client/stores/notification.store";
import {
  PersistenceActionType,
  StoreDataType,
  type IObservableStoreSubject,
  type IRecordId
} from "$lib/client/types/data.type";
import { Placement } from "$lib/client/types/direction.enum";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
import { AlertType } from "$lib/client/types/notification.type";
import { objIsEmpty, shallowDiff } from "$lib/shared/utils/obj.utils";
import { replaceParams } from "$lib/client/persistence/surreal/surreal.utils";
import { activeResourceFilter, debouncer } from "$lib/client/utils/utils";
import { removeHighlight } from "./highlightV4";
import {
  SyncStatus,
  type IFeedbackPaneStore,
  type ISyncStore,
  type IWebpageStore
} from "./types";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import {
  NodeIdPrefix,
  NodeType,
  type IClip,
  type IClipCapture,
  type ITweet,
  type ITwitterProfile,
  type IWebScreenshotClip,
  type IWebPage,
  type IKindleBook,
  type IKindleHighlight,
  type ITextClip,
  type IVideoTimestampClip
} from "$lib/client/products/memotron/node/node.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import {
  extractFullTabData,
  extractMinimalTabData,
  resolveUrl
} from "../clipper.utils";
import type {
  CaptureOmittedFields,
  OmitFields,
  OmitForCapture,
  OmitForCaptureWithId
} from "$lib/client/components/flux/resourceStores/resource.type";
import { logger } from "$lib/client/components/debug/logger.client";
import { ExtensionEvent } from "$lib/client/types/extension.type";
import {
  relayToBackgroundScript,
  relayToSidePanel
} from "$lib/client/utils/extension.utils";
import { commonMetadata } from "$lib/client/products/memotron/common/urlMap";
import { extensionFlux } from "$lib/client/components/flux/fluxExtentionMediator";
import { FluxMethod } from "$lib/client/components/flux/flux.type";

class WebpageStore extends ObservableStore<IWebpageStore> {
  previousValue: string = "";
  constructor() {
    super("clipperContentScriptStore");
    this.set({ url: "", clips: [] });
  }

  reset() {
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

  /**
   * TODO - save url as top level field - to enable querying via dexie, fetching links
   */
  async refresh() {
    const result = await extensionFlux({
      method: FluxMethod.SELECT_MANY,
      args: {
        resource: Resource.node,
        params: {
          search: {
            properties: ["url"],
            query: this.get().url
          }
        }
      }
    });
    logger.debug({ at: "refresh", result });
    const page =
      result && Array.isArray(result) && result.length > 0
        ? result.find((r: IWebPage) => r.url === this.get().url)
        : null;

    logger.log({ at: "refresh", url: this.get().url, page, result });
    if (!page) {
      this.loader({ page: { url: this.get().url, clips: [] } });
      return;
    }
    const clips = await extensionFlux({
      method: FluxMethod.SELECT_MANY,
      args: {
        resource: Resource.node,
        params: {
          filters: {
            parent: page.id
          }
        }
      }
    });
    const linksResult = await extensionFlux({
      method: FluxMethod.SELECT_MANY,
      args: {
        resource: Resource.link,
        params: {
          filters: {
            in: page.id
          }
        }
      }
    });
    let links: IRecordId[] = [];
    if(linksResult && Array.isArray(linksResult)) {
      links = linksResult.map((l) => l.out);
    }
    logger.debug({ at: "refresh", page, clips, links, linksResult });
    this.loader({ page: { ...page, clips: clips ?? [], links } });
  }

  /**
  * when a tab is changed, this method is called to update the store with the new tab data.

  TODO - whether to refresh or not - when a tab is changed, the content script is reinjected, and therefore the store is refreshed from dataManager refreshApp.
  * @param tab
  * @returns
  */
  onContextChange(tab: chrome.tabs.Tab) {
    const url = resolveUrl(tab.url);
    const webpage = this.get();
    logger.log({ at: "onContextChange", url, webpage });
    if (url === webpage.url) return;
    this.set({ url, clips: [] });
    feedbackPane.reset();
    this.refresh();
  }

  /**
   * @param data - tab data
   * @returns
   */
  async savePage(creationContext?: IRecordId) {
    let data: OmitForCapture<IWebPage> = await extractData();
    const id = generateResourceId(Resource.node);
    const node = {
      id,
      ...data,
      creationContext
    };
    const response = await nodeStore.create([node]);
    this.update((n) => {
      n.id = id;
      return n;
    });
    relayToSidePanel({ event: ExtensionEvent.PAGE_STATE, data: node });
    return id;

    async function extractData() {
      const host = window.location.host;
      if (
        commonMetadata.some(
          (x) => host === x.domain || host.includes("." + x.domain)
        )
      ) {
        logger.log({
          at: "extractData",
          host,
          message: "minimal metadata page"
        });
        return extractMinimalTabData();
      }
      const s3Url = await screenshotWebpage();
      const tab = await extractFullTabData();
      tab.metadata = { ...tab.metadata, screenshotUrl: s3Url };
      return tab;

      async function screenshotWebpage() {
        const result = await relayToBackgroundScript({
          event: ClipperExtensionEvent.SCREENSHOT,
          data: {
            isUpload: true,
            isReturnUrl: true
          }
        });
        console.log({ at: "screenshotWebpage", result });
        return result;
      }
    }
  }
  /**
   * Saves the clip to the database. If the webpage is not saved, it will be saved first by parsing the DOM for web page metadata.
   *
   * Note: This method will not work if called from non content script context as parsing the DOM is not possible.
   * @param data
   * @param tabData
   * @returns
   */
  async saveClip(data: IClipCapture) {
    let webpage = this.get();
    logger.log({ at: "saveClip", webpage, data });

    const id = generateResourceId(Resource.node);
    if (!webpage.id) {
      await this.savePage(id);
    }
    webpage = this.get();
    const clipUrl = resolveClipUrl(data);
    const clip: OmitForCapture<IWebScreenshotClip | ITextClip | IVideoTimestampClip> = {
      id,
      url: clipUrl,
      body: {
        ...data.body,
      },
      metadata: data.metadata,
      parent: webpage.id,
      contentType: data.contentType,
      label: undefined
    };
    const response = await nodeStore.create([clip]);
    if (!response || !Array.isArray(response)) return;
    logger.log({ at: "saveClip", response });
    const clipNode = response[0] as IWebScreenshotClip;
    if (!clipNode) return;
    this.update((n) => {
      n.clips = [...(n.clips ?? []), { ...clipNode, links: [] }];
      return n;
    });
    if (clip.contentType === NodeType.WEB_SCREENSHOT_CLIP) {
      feedbackPane.focus(clipNode, "Clip saved!");
    }
    return clip;

    function resolveClipUrl(data: any) {
      if ("url" in data && data.url) return data.url;
      else return (webpage.url ?? window.location.href) + "#" + id;
    }
  }
  async saveTweet(
    data: OmitFields<
      ITweet & {
        username: string;
        profileUrl: string;
        authorName: string;
        profileImageUrl: string;
      },
      CaptureOmittedFields | "label"
    >,
    isFromTweetPage: boolean = false
  ) {
    logger.log({ at: "saveTweet", data });
    const id = generateResourceId(Resource.node);
    const twitterProfileId = generateResourceId(Resource.node, {
      prefix: NodeIdPrefix.TWITTER_PROFILE,
      id: data.username as string
    });
    const tweetNode: OmitForCaptureWithId<ITweet> = {
      id,
      url: data.url,
      body: data.body,
      metadata: data.metadata,
      parent: twitterProfileId,
      contentType: NodeType.TWEET
    };
    const twitterProfileNode: OmitForCapture<ITwitterProfile> = {
      url: data.profileUrl,
      body: {
        name: data.authorName,
        profileImageUrl: data.profileImageUrl
      },
      metadata: {},
      contentType: NodeType.TWITTER_PROFILE
    };
    const response = await nodeStore.create([
      { ...tweetNode, label: undefined },
      {
        ...twitterProfileNode,
        id: twitterProfileId,
        label: undefined,
        creationContext: id
      }
    ]);
    if (!response || !Array.isArray(response)) return;
    const tweet = response[0] as ITweet;
    this.update((n) => {
      n.clips = [...(n.clips ?? []), { ...tweet, links: [] }];
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
  async saveTwitterProfile(
    data: OmitForCapture<ITwitterProfile & { username: string }>
  ) {
    const twitterProfileId = generateResourceId(Resource.node, {
      prefix: NodeIdPrefix.TWITTER_PROFILE,
      id: data.username as string
    });
    logger.log({ at: "saveTwitterProfile", data, twitterProfileId });
    const response = await nodeStore.create([
      { ...data, id: twitterProfileId, label: undefined }
    ]);
    if (!response || !Array.isArray(response)) return;
    const node = response[0] as ITwitterProfile;
    this.update((n) => {
      n.clips = [...(n.clips ?? []), { ...node, links: [] }];
      n.id = node.id;
      return n;
    });
    feedbackPane.focus(node, "Twitter profile saved!");
    return node;
  }
  async linkPage(to: string) {
    const webpage = this.get();
    const isAlreadyLinked = webpage.links?.some((l) => l === to);
    if (isAlreadyLinked)
      return { message: "Already linked", type: AlertType.ERROR };
    if (!webpage.id) return;
    const response = await linker.link(webpage.id, to);
    if (!response) return { message: "Linking failed", type: AlertType.ERROR };
    this.update((n) => {
      n.links = [...(n.links ?? []), to];
      return n;
    });
    return { message: "Linked!", type: AlertType.SUCCESS };
  }
  async removeLinkForPage(to: string) {
    const webpage = this.get();
    if (!webpage.id) return;
    const response = await linker.unlink(webpage.id, to);
    if (!response)
      return { message: "Unlinking failed", type: AlertType.ERROR };
    this.update((n) => {
      n.links = n.links?.filter((l) => l !== to);
      return n;
    });
    return { message: "Unlinked!", type: AlertType.SUCCESS };
  }
  async linkClip(from: IRecordId, to: IRecordId) {
    const webpage = this.get();
    const clip = webpage?.clips?.find((c) => c.id === from);
    if (!clip) return;
    const isAlreadyLinked = clip.links?.some((l) => l === to);
    if (isAlreadyLinked)
      return { message: "Already linked", type: AlertType.ERROR };
    const response = await linker.link(from, to);
    if (!response) return { message: "Linking failed", type: AlertType.ERROR };
    this.update((n) => {
      n.clips = n.clips?.map((c) => {
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
  async removeLinkForClip(from: IRecordId, to: IRecordId) {
    const response = await linker.unlink(from, to);
    if (!response)
      return { message: "Unlinking failed", type: AlertType.ERROR };
    this.update((n) => {
      n.clips = n.clips?.map((c) => {
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
      n.clips = n.clips?.filter((c) => c.id !== id);
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
  set(newValue: IWebpageStore) {
    let changedProperties: any = {};
    if (this.previousValue) {
      let differences = shallowDiff(newValue, JSON.parse(this.previousValue));
      differences.forEach((key: string) => {
        changedProperties[key] = newValue[key as keyof IWebpageStore];
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
  async persistClipNotes(id: IRecordId, notes: string) {
    return new Promise((resolve) => {
      const result = this._debouncedPersistNotes(id, notes);
      resolve(result);
    });
  }
}
export const webpage = new WebpageStore();

class FeedbackPaneStore extends ObservableStore<IFeedbackPaneStore> {
  constructor() {
    super("feedbackPane");
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
    logger.log({ at: "feedbackPane.focus", clip, message });
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
    position: Placement.Right | Placement.Left | Placement.Bottom;
  } & IObservableStoreSubject
> {
  constructor() {
    super(
      Resource.clipperToolbarState,
      { isOpen: true, position: Placement.Right },
      {
        dboDependencies: ["fn::global::utils::resolveUrlParts::v2"]
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
  changePosition(
    position: Placement.Right | Placement.Left | Placement.Bottom
  ) {
    this.modify({ position });
  }
}

export const toolbarState = new ClipperToolbarState();

class SyncStore extends ObservableStore<ISyncStore> {
  constructor() {
    super(Resource.clipperSync);
    this.set({
      id: undefined,
      status: SyncStatus.NOT_SYNCED,
      isShowSyncPane: false
    });
  }
  async init(id: string) {
    this.update((n) => {
      n.id = id;
      return n;
    });
    await this.refreshSyncState();
    this.update((n) => {
      n.isShowSyncPane = true;
      return n;
    });
  }

  togglePane() {
    this.update((n) => {
      n.isShowSyncPane = !n.isShowSyncPane;
      return n;
    });
  }

  async save(items: OmitForCaptureWithId<IKindleBook | IKindleHighlight>[]) {
    logger.log({ at: "syncStore save", items });
    if (!items || items.length < 1) return;
    const limitCount = 500;
    let response;
    if (items.length > limitCount) {
      response = await Promise.all(resolveChunks());
    } else {
      response = await nodeStore.create(items);
    }

    function resolveChunks() {
      const promises = [];
      for (let i = 0; i < items.length; i += limitCount) {
        promises.push(nodeStore.create(items.slice(i, i + limitCount)));
      }
      return promises;
    }
  }

  async updateSyncStatus(status: SyncStatus) {
    this.update((n) => {
      n.status = status;
      return n;
    });
    if (status == SyncStatus.SYNCED) await this.persistSyncStatus(status);
  }

  async refreshSyncState() {
    try {
      const id = this.get().id;
      const result = await extensionFlux({
        method: FluxMethod.SELECT,
        args: {
          resourceId: "kv:clipperSync"
        }
      });
      logger.log({ at: "syncStore refreshSyncState", result, id });
      if (result) {
        const record = result;
        if (record[id]) {
          this.update((n) => {
            n.status = record[id].status;
            n.lastSyncedAt = record[id].updatedAt;
            return n;
          });
        }
      }
    } catch (e) {
      logger.error(e);
    }
  }

  async persistSyncStatus(status: SyncStatus) {
    try {
      const id = this.get().id;
      if (!id) return;
      //TODO - test merge mutation
      const query = `UPDATE kv:clipperSync SET ${id}={
        status: "${status}",
        updatedAt: time::now()
      };`;
      const result = await extensionFlux({
        method: FluxMethod.MUTATION,
        args: {
          resource: Resource.clipperSync,
          params: {
            action: PersistenceActionType.CUSTOM,
            query
          }
        }
      });
      const resultWithMerge = await extensionFlux({
        method: FluxMethod.MUTATION,
        args: {
          resource: Resource.kv,
          params: {
            action: PersistenceActionType.MERGE,
            record: {
              id: "kv:clipperSync",
              [id]: {
                status,
                updatedAt: new Date().toISOString()
              }
            }
          }
        }
      });
      console.log({ result, resultWithMerge });
    } catch (e) {
      logger.error(e);
    }
  }
}

export const syncStore = new SyncStore();
