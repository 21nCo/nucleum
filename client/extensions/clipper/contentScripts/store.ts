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
import { activeResourceFilter } from "$lib/client/utils/utils";
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
  type IVideoTimestampClip,
  type INodePropertyValue
} from "$lib/client/products/memotron/node/node.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import {
  extractFullTabData,
  extractMinimalTabData,
  extractYoutubeVideoData,
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
import { extensionFlux } from "$lib/client/components/flux/fluxExtentionMediator";
import { FluxMethod } from "$lib/client/components/flux/flux.type";
import {
  determineResourceType,
  isSameResource,
  resourceInList
} from "$lib/client/components/flux/resourceStores/resource.utils";
import { ResourceError } from "$lib/client/components/error/errors";
import {
  ErrorMessage,
  ResourceErrorCode
} from "$lib/client/components/error/error.type";
import {
  fetchYouTubeMetadata,
  resolveUrlData
} from "$lib/client/products/memotron/node/url.utils";
import { Persistence } from "$lib/client/persistence/persistence";

class WebpageStore extends ObservableStore<IWebpageStore> {
  previousValue: string = "";
  constructor() {
    super("clipperContentScriptStore");
    this.set({ url: "", clips: [], title: "" });
  }

  reset() {
    this.set({ url: "", clips: [], title: "" });
    appEvents.publish(ClipperExtensionEvent.REFRESH_CLIPS_RENDERING);
  }

  async loader(data: any) {
    logger.debug({ at: "webpage loader", data });
    const page = data.page;
    this.update((n) => {
      n.id = page?.id;
      n.clips =
        page?.clips?.length > 0 ? page.clips.filter(activeResourceFilter) : [];
      n.links = page?.links ?? [];
      n.notes = page?.notes ?? "";
      n.title = page?.label ?? window.document.title;
      n.properties = page?.properties ?? [];
      return n;
    });
    appEvents.publish(ClipperExtensionEvent.REFRESH_CLIPS_RENDERING);
    relayToSidePanel({
      event: ExtensionEvent.PAGE_STATE,
      data: {
        page: this.get(),
        toolbar: toolbarState.get()
      }
    });
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
        ? result
            .filter(activeResourceFilter)
            .find((r: IWebPage) => r.url === this.get().url)
        : null;

    logger.debug({ at: "refresh", url: this.get().url, page, result });
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
            in: [page.id, ...(clips?.map((c) => c.id) ?? [])]
          }
        }
      }
    });
    let rootLinks: IRecordId[] = [];
    if (linksResult && Array.isArray(linksResult)) {
      rootLinks = linksResult.filter((l) => l.in === page.id).map((l) => l.out);
      if (clips && Array.isArray(clips)) {
        clips.forEach((c) => {
          c.links = linksResult.filter((l) => l.in === c.id).map((l) => l.out);
        });
      }
    }
    logger.debug({ at: "refresh", page, clips, links: rootLinks, linksResult });
    this.loader({ page: { ...page, clips: clips ?? [], links: rootLinks } });
  }

  /**
   * when a tab is changed, this method is called to update the store with the new tab data.
   *
   * @param tab
   * @returns
   */
  onContextChange(tab: chrome.tabs.Tab) {
    const url = resolveUrl(tab.url);
    const webpage = this.get();
    logger.debug({ at: "onContextChange", tab, url, webpage });
    toolbarState.refresh();
    this.set({ url, clips: [], title: tab.title ?? window.document.title });
    feedbackPane.reset();
    this.refresh();
  }

  /**
   * @param data - tab data
   * @returns
   */
  async savePage(params?: {
    creationContext?: IRecordId;
    contentType?: NodeType;
  }) {
    let data: OmitForCapture<IWebPage> = await extractData();
    const id = generateResourceId(Resource.node);
    const node = {
      id,
      ...data,
      creationContext: params?.creationContext
    };
    const response = await nodeStore.create([node]);
    if (!response) return;
    logger.log({ at: "savePage", response });
    this.update((n) => {
      n.id = id;
      return n;
    });
    relayToSidePanel({
      event: ExtensionEvent.PAGE_STATE,
      data: {
        page: node,
        toolbar: toolbarState.get()
      }
    });
    return response;

    /**
     * Disabling capturing of screenshot as it is adding latency to page save action.
     * @returns
     */
    async function extractData() {
      if (params?.contentType === NodeType.YOUTUBE_VIDEO) {
        return extractYoutubeVideoData();
      } else if (params?.contentType === NodeType.YOUTUBE_CHANNEL) {
        const urlData = await new Persistence().retrieveUrlData(
          window.location.href
        );
        if (urlData?.parsedData) {
          return urlData.parsedData;
        } else {
          return extractMinimalTabData();
        }
      }
      const host = window.location.host;
      if (resolveUrlData(host)) {
        logger.log({
          at: "extractData",
          host,
          message: "minimal metadata page"
        });
        return extractMinimalTabData();
      }
      // const ssFile = await screenshotWebpage();
      const tab = await extractFullTabData();
      tab.metadata = {
        ...tab.metadata
        //screenshotFile: ssFile.id
      };
      return tab;

      async function screenshotWebpage() {
        const ss = await relayToBackgroundScript({
          event: ClipperExtensionEvent.SCREENSHOT
        });
        const result = await relayToBackgroundScript({
          event: ExtensionEvent.UPLOAD_FILE,
          data: {
            dataUrl: ss.data,
            contentType: "image/png",
            params: {
              isMeta: true,
              thumbnailDataUrl: ss.lowRes
            }
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
    logger.debug({ at: "saveClip", webpage, data });

    const id = generateResourceId(Resource.node);
    if (!webpage.id) {
      await this.savePage({ creationContext: id });
    }
    webpage = this.get();
    const clipUrl = resolveClipUrl(data);
    const clip: OmitForCapture<
      IWebScreenshotClip | ITextClip | IVideoTimestampClip
    > = {
      id,
      url: clipUrl,
      body: {
        ...data.body
      },
      text: data.text,
      metadata: data.metadata,
      parent: webpage.id,
      contentType: data.contentType,
      label: undefined
    };
    const response = await nodeStore.create([clip]);
    if (!response || !Array.isArray(response)) return;
    logger.debug({ at: "saveClip", response });
    const clipNode = response[0] as IWebScreenshotClip;
    if (!clipNode) return;
    const clips = [...(this.get().clips ?? []), { ...clipNode, links: [] }];
    this.update((n) => {
      n.clips = clips;
      return n;
    });
    appEvents.publish(ClipperExtensionEvent.REFRESH_CLIPS_RENDERING);
    relayToSidePanel({
      event: ClipperExtensionEvent.CLIPS_CHANGED,
      data: clips
    });
    if (clip.contentType === NodeType.WEB_SCREENSHOT_CLIP) {
      feedbackPane.focus(clipNode, {
        message: "Clip saved!",
        type: AlertType.SUCCESS
      });
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
    logger.debug({ at: "saveTweet", data });
    // const id = generateResourceId(Resource.node);
    const tweetId = generateResourceId(Resource.node, {
      prefix: NodeIdPrefix.TWEET,
      id: data.username + "_" + data.metadata?.tweetId
    });
    const twitterProfileId = generateResourceId(Resource.node, {
      prefix: NodeIdPrefix.TWITTER_PROFILE,
      id: data.username as string
    });
    const tweetNode: OmitForCaptureWithId<ITweet> = {
      id: tweetId,
      url: data.url,
      body: data.body,
      text: data.text ?? data.body.content,
      metadata: data.metadata,
      parent: twitterProfileId,
      contentType: NodeType.TWEET
    };
    const twitterProfileNode: OmitForCapture<ITwitterProfile> = {
      url: data.profileUrl,
      label: data.authorName,
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
        creationContext: tweetId
      }
    ]);
    if (!response || !Array.isArray(response)) return;
    const tweet = response[0] as ITweet;
    this.update((n) => {
      n.clips = [...(n.clips ?? []), { ...tweet, links: [] }];
      if (isFromTweetPage) n.id = tweet.id;
      return n;
    });
    if (isFromTweetPage) { 
      relayToSidePanel({
        event: ExtensionEvent.PAGE_STATE,
        data: {
          page: this.get(),
          toolbar: toolbarState.get()
        }
      });
    } else {
      feedbackPane.focus(tweet, {
        message: "Tweet saved!",
        type: AlertType.SUCCESS
      });
    }
    return tweetNode;
  }

  focus(url: string, message: string | { message: string; type: AlertType }) {
    logger.log({ at: "focus", url, message });
    const webpage = this.get();
    if (webpage.url === url) {
      feedbackPane.toggle({ isUserInitiated: true });
    } else {
      const clip = webpage.clips?.find((c) => c.url === url);
      if (clip) {
        feedbackPane.focus(clip, message);
      }
    }
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
      { ...data, id: twitterProfileId }
    ]);
    if (!response || !Array.isArray(response)) return;
    const node = response[0] as ITwitterProfile;
    this.update((n) => {
      n.clips = [...(n.clips ?? []), { ...node, links: [] }];
      n.id = node.id;
      return n;
    });
    feedbackPane.focus(node, {
      message: "Twitter profile saved!",
      type: AlertType.SUCCESS
    });
    return node;
  }

  async linkPage(to: string) {
    try {
      const webpage = this.get();
      const isAlreadyLinked = webpage.links?.some((l) => l === to);
      if (isAlreadyLinked)
        return { message: "Already linked", type: AlertType.ERROR };
      if (!webpage.id) return;
      const response = await linker.link(webpage.id, to);
      if (!response)
        return { message: "Linking failed", type: AlertType.ERROR };
      const resourceType = determineResourceType(to);
      if (resourceType === Resource.collection) {
        const collections = [...(webpage.collections ?? []), to];
        this.update((n) => {
          n.links = [...(n.links ?? []), to];
          n.collections = collections;
          return n;
        });
        await nodeStore.modify(webpage.id, {
          collections
        });
        relayToSidePanel({
          event: ClipperExtensionEvent.ON_COLLECTION_LINK_CHANGES,
          data: {
            from: webpage.id,
            to
          }
        });
      } else {
        this.update((n) => {
          n.links = [...(n.links ?? []), to];
          return n;
        });
      }
      return { message: "Linked!", type: AlertType.SUCCESS };
    } catch (e) {
      logger.error(e);
      if (e instanceof ResourceError) {
        if (e.code === ResourceErrorCode.ALREADY_EXISTS) {
          return { message: "Already linked", type: AlertType.ERROR };
        }
      }
      return { message: "Linking failed", type: AlertType.ERROR };
    }
  }

  async removeLinkForPage(to: string) {
    const webpage = this.get();
    if (!webpage.id) return;
    const response = await linker.unlink(webpage.id, to);
    if (!response)
      return { message: "Unlinking failed", type: AlertType.ERROR };
    const resourceType = determineResourceType(to);
    if (resourceType === Resource.collection) {
      const collections = webpage.collections?.filter(
        (c) => !isSameResource(c, to)
      );
      this.update((n) => {
        n.collections = collections;
        n.links = n.links?.filter((l) => !isSameResource(l, to));
        return n;
      });
      relayToSidePanel({
        event: ClipperExtensionEvent.ON_COLLECTION_LINK_CHANGES,
        data: {
          from: webpage.id,
          to
        }
      });
    } else {
      this.update((n) => {
        n.links = n.links?.filter((l) => !isSameResource(l, to));
        return n;
      });
    }
    return { message: "Unlinked!", type: AlertType.SUCCESS };
  }

  async linkClip(
    from: IRecordId,
    to: IRecordId,
    params?: {
      isFromSidePanel?: boolean;
    }
  ) {
    const webpage = this.get();
    const clip = webpage?.clips?.find(resourceInList(from));
    if (!clip)
      throw new ResourceError("Clip not found", ResourceErrorCode.NOT_FOUND);
    const isAlreadyLinked = clip.links?.some(resourceInList(to));
    if (isAlreadyLinked)
      throw new ResourceError(
        "Already linked",
        ResourceErrorCode.ALREADY_EXISTS
      );
    const response = await linker.link(from, to);
    if (!response || response.error)
      throw new ResourceError(
        response?.error ?? "Linking failed",
        ResourceErrorCode.INTERNAL_ERROR
      );
    const resourceType = determineResourceType(to);
    if (resourceType === Resource.collection) {
      const collections = [...(clip.collections ?? []), to];
      this.update((n) => {
        n.clips = n.clips?.map((c) => {
          if (isSameResource(c, from)) {
            c.collections = collections;
            c.links = [...(c.links ?? []), to];
            return c;
          }
          return c;
        });
        return n;
      });
      await nodeStore.modify(clip.id, {
        collections
      });
    } else {
      this.update((n) => {
        n.clips = n.clips?.map((c) => {
          if (isSameResource(c, from)) {
            c.links = [...(c.links ?? []), to];
          }
          return c;
        });
        return n;
      });
    }
    appEvents.publish(ClipperExtensionEvent.REFRESH_CLIPS_RENDERING);
    if (!params?.isFromSidePanel) {
      relayToSidePanel({
        event: ClipperExtensionEvent.REFRESH_CLIP,
        data: {
          clipId: from,
          clip: this.get().clips?.find(resourceInList(from))
        }
      });
      if(resourceType === Resource.collection){
        relayToSidePanel({
          event: ClipperExtensionEvent.ON_COLLECTION_LINK_CHANGES,
          data: {
            from,
            to
          }
        });
      }
    }
    return response;
  }

  async removeLinkForClip(
    from: IRecordId,
    to: IRecordId,
    params?: {
      isFromSidePanel?: boolean;
    }
  ) {
    const response = await linker.unlink(from, to);
    if (!response)
      return { message: "Unlinking failed", type: AlertType.ERROR };
    const resourceType = determineResourceType(to);
    if (resourceType === Resource.collection) {
      const clip = this.get().clips?.find(resourceInList(from));
      if (!clip) return;
      const collections = clip.collections?.filter(
        (c) => !isSameResource(c, to)
      );
      this.update((n) => {
        n.clips = n.clips?.map((c) => {
          if (isSameResource(c, from)) {
            c.collections = collections;
            c.links = c.links?.filter((l) => !isSameResource(l, to));
          }
          return c;
        });
        return n;
      });
    } else {
      this.update((n) => {
        n.clips = n.clips?.map((c) => {
          if (isSameResource(c, from)) {
            c.links = c.links?.filter((l) => !isSameResource(l, to));
          }
          return c;
        });
        return n;
      });
    }
    appEvents.publish(ClipperExtensionEvent.REFRESH_CLIPS_RENDERING);
    if (!params?.isFromSidePanel) {
      relayToSidePanel({
        event: ClipperExtensionEvent.REFRESH_CLIP,
        data: {
          clipId: from,
          clip: this.get().clips?.find(resourceInList(from))
        }
      });
      if(resourceType === Resource.collection){
        relayToSidePanel({
          event: ClipperExtensionEvent.ON_COLLECTION_LINK_CHANGES,
          data: {
            from,
            to
          }
        });
      }
    }
    return { message: "Unlinked!", type: AlertType.SUCCESS };
  }

  async removeClip(
    id: string,
    params?: {
      isFromSidePanel?: boolean;
    }
  ) {
    const response = await nodeStore.trash(id);
    console.log({ response });
    if (!response)
      return { message: "Clip removal failed", type: AlertType.ERROR };
    this.update((n) => {
      n.clips = n.clips?.filter((c) => c.id.toString() !== id.toString());
      return n;
    });
    removeHighlight(id);
    appEvents.publish(ClipperExtensionEvent.REFRESH_CLIPS_RENDERING);
    if (!params?.isFromSidePanel) {
      relayToSidePanel({
        event: ClipperExtensionEvent.CLIPS_CHANGED,
        data: this.get().clips
      });
    }
    return { message: "Clip removed!", type: AlertType.SUCCESS };
  }

  async updateTextClipColor(id: IRecordId, highlighterId: string) {
    const updateResult = await nodeStore.modify(id, {
      body: { highlighterId }
    });
    if (!updateResult) return;
    console.log({ updateResult });
    this.update((n) => {
      n.clips = n.clips?.map((x) => {
        if (isSameResource(x.id, id)) {
          x.body.highlighterId = highlighterId;
          return x;
        }
        return x;
      });
      console.log({ clips: n.clips, id, highlighterId });
      return n;
    });
    relayToSidePanel({
      event: ClipperExtensionEvent.REFRESH_CLIP,
      data: { clipId: id, clip: this.get().clips?.find(resourceInList(id)) }
    });
    return { message: "Color updated!", type: AlertType.SUCCESS };
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

  private async _persistNotes(id: IRecordId, notes: string) {
    return nodeStore.modify(id, { notes });
  }

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
      this._persistNotes(newValue.id, newValue.notes);
    }
  }

  async persistPageNotes(notes: string, params?: { isFromSidePanel?: boolean }) {
    const webpage = this.get();
    if (!webpage.id) return;
    const response = await this._persistNotes(webpage.id, notes);
    if (!response) return;
    this.update((n) => {
      n.notes = notes;
      return n;
    });
    if (!params?.isFromSidePanel) {
      relayToSidePanel({
        event: ExtensionEvent.PAGE_STATE,
        data: {
          page: this.get(),
          toolbar: toolbarState.get()
        }
      }); 
    }
    return response;
  }

  async persistClipNotes(
    id: IRecordId,
    notes: string,
    params?: {
      isFromSidePanel?: boolean;
    }
  ) {
    const webpage = this.get();
    if (!webpage?.clips) return;
    const clip = webpage.clips?.find(resourceInList(id));
    if (!clip) return;
    const response = await this._persistNotes(id, notes);
    if (!response) return;
    this.update((n) => {
      n.clips = n.clips?.map((c) => {
        if (isSameResource(c, id)) {
          console.log({ at: "persistClipNotes", c, notes });
          c.notes = notes;
          return c;
        }
        return c;
      });
      return n;
    });
    if (!params?.isFromSidePanel) {
      relayToSidePanel({
        event: ClipperExtensionEvent.REFRESH_CLIP,
        data: { clipId: id, clip: this.get().clips?.find(resourceInList(id)) }
      });
    }
    return response;
  }

  async updateClipLabel(
    id: IRecordId,
    label: string,
    params?: {
      isFromSidePanel?: boolean;
    }
  ) {
    const response = await nodeStore.modify(id, { label });
    if (!response) return;
    this.update((n) => {
      n.clips = n.clips?.map((c) => {
        if (isSameResource(c, id)) {
          c.label = label;
          return c;
        }
        return c;
      });
      return n;
    });
    if (!params?.isFromSidePanel) {
      relayToSidePanel({
        event: ClipperExtensionEvent.REFRESH_CLIP,
        data: { clipId: id, clip: this.get().clips?.find(resourceInList(id)) }
      });
    }
    return response;
  }

  async updatePageProperty(property: INodePropertyValue) {
    const webpage = this.get();
    if (!webpage.id) return;
    const properties = webpage.properties?.filter(
      (x) => !isSameResource(x, property)
    );
    const newProperties = [...(properties ?? []), property];
    const response = await this.updateProperties(webpage.id, newProperties);
    if (!response || response.error) return;
    this.update((n) => {
      n.properties = [...newProperties];
      return n;
    });
    return response;
  }

  async updateClipProperty(
    id: IRecordId,
    property: INodePropertyValue,
    params?: {
      isFromSidePanel?: boolean;
    }
  ) {
    logger.log({
      at: "updateClipProperty",
      id,
      property,
      clips: this.get().clips
    });
    const webpage = this.get();
    if (!webpage?.clips) return;
    const clip = webpage.clips?.find(resourceInList(id));
    if (!clip) return;
    const properties = clip.properties?.filter(
      (x) => !isSameResource(x, property)
    );
    const newProperties = [...(properties ?? []), property];
    const response = await this.updateProperties(id, newProperties);
    if (!response || response.error) return;
    this.update((n) => {
      n.clips = n.clips?.map((c) => {
        if (isSameResource(c, id)) {
          c.properties = [...newProperties];
        }
        return c;
      });
      return n;
    });
    if (!params?.isFromSidePanel) {
      relayToSidePanel({
        event: ClipperExtensionEvent.REFRESH_CLIP,
        data: { clipId: id, clip: this.get().clips?.find(resourceInList(id)) }
      });
    }
    return response;
  }

  private updateProperties(id: IRecordId, properties: INodePropertyValue[]) {
    return nodeStore.modify(id, {
      properties: [...properties]
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
  toggle(params?: { isUserInitiated?: boolean }) {
    this.update((n) => {
      n.isShown = !n.isShown;
      n.isUserInitiated = params?.isUserInitiated ?? false;
      return n;
    });
  }
  focus(
    clip: IClip | null,
    message: string | { message: string; type: AlertType }
  ) {
    logger.log({ at: "feedbackPane.focus", clip, message });
    this.update((n) => {
      n.focusedClip = clip;
      n.feedback = message;
      n.isShown = true;
      return n;
    });
  }

  /**
   * Sets saving status with single message and prevents auto close.
   * @param text
   */
  onPageSaveStart(text: string) {
    this.update((n) => {
      n.feedback = {
        message: text,
        type: AlertType.PROGRESS
      };
      n.isShown = true;
      n.isPreventAutoClose = true;
      n.isShowStatusOnly = true;
      return n;
    });
  }

  onPageSaveSuccess(message: string) {
    this.update((n) => {
      n.feedback = {
        message,
        type: AlertType.SUCCESS
      };
      n.isPreventAutoClose = false;
      n.isShowStatusOnly = false;
      return n;
    });
  }

  setErrorFeedback(params?: {
    message?: string;
    isPreventAutoClose?: boolean;
  }) {
    this.update((n) => {
      n.feedback = {
        message: params?.message ?? ErrorMessage.DEFAULT,
        type: AlertType.ERROR
      };
      if (params?.isPreventAutoClose !== undefined) {
        n.isPreventAutoClose = params.isPreventAutoClose;
      }
      return n;
    });
  }
}

export const feedbackPane = new FeedbackPaneStore();

class ClipperToolbarState extends KeyValueStore<
  {
    /**
     * Whether the toolbar is open or collapsed
     */
    isOpen: boolean;
    /**
     * Whether the toolbar is hidden
     */
    isHidden?: boolean;
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

  toggleVisibility(isHidden?: boolean) {
    if (isHidden === undefined) {
      isHidden = !this.get().isHidden;
    }
    this.modify({ isHidden });
    setTimeout(() => {
      webpage.refresh();
    }, 100);
  }

  changePosition(
    position: Placement.Right | Placement.Left | Placement.Bottom
  ) {
    this.modify({ position });
  }

  async refresh() {
    const result = await extensionFlux({
      method: FluxMethod.SELECT,
      args: {
        resourceId: "kv:" + Resource.clipperToolbarState
      }
    });
    if (result && result.id) {
      this.update((n) => {
        n.isOpen = result.isOpen;
        n.position = result.position;
        return n;
      });
    }
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
    // items = items.slice(0, 800);
    const limitCount = 300;
    let response;
    this.update((n) => {
      n.progress = 0;
      return n;
    });
    if (items.length > limitCount) {
      // response = await Promise.all(resolveChunks());
      const chunks = resolveChunks();
      logger.log({ at: "syncStore save", chunks });
      for (const chunk of chunks) {
        response = await chunk();
        this.update((n) => {
          n.progress = (chunks.indexOf(chunk) / chunks.length) * 100;
          return n;
        });
      }
    } else {
      response = await nodeStore.create(items);
    }
    this.update((n) => {
      n.progress = 100;
      return n;
    });
    // function resolveChunks() {
    //   const promises = [];
    //   for (let i = 0; i < items.length; i += limitCount) {
    //     promises.push(nodeStore.create(items.slice(i, i + limitCount)));
    //   }
    //   return promises;
    // }
    function resolveChunks(): (() => Promise<any>)[] {
      const chunks: (() => Promise<any>)[] = [];
      for (let i = 0; i < items.length; i += limitCount) {
        chunks.push(() => nodeStore.create(items.slice(i, i + limitCount)));
      }
      return chunks;
    }
  }

  async updateSyncStatus(status: SyncStatus, message?: string) {
    this.update((n) => {
      n.status = status;
      n.message = message;
      return n;
    });
    if (status == SyncStatus.SYNCED) {
      this.update((n) => {
        n.lastSyncedAt = new Date().toISOString();
        return n;
      });
      await this.persistSyncStatus(status);
    }
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
      // const query = `UPDATE kv:clipperSync SET ${id}={
      //   status: "${status}",
      //   updatedAt: time::now()
      // };`;
      // const result = await extensionFlux({
      //   method: FluxMethod.MUTATION,
      //   args: {
      //     resource: Resource.clipperSync,
      //     params: {
      //       action: PersistenceActionType.CUSTOM,
      //       query
      //     }
      //   }
      // });
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
      console.log({ resultWithMerge });
    } catch (e) {
      logger.error(e);
    }
  }
}

export const syncStore = new SyncStore();
