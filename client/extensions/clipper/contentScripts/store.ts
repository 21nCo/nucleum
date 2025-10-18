import { logger } from "$lib/client/components/debug/logger.client";
import {
  ErrorMessage,
  ResourceErrorCode
} from "$lib/client/components/error/error.type";
import { ResourceError } from "$lib/client/components/error/errors";
import { FluxMethod } from "$lib/client/components/flux/flux.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import { extensionFlux } from "$lib/client/components/flux/fluxExtentionMediator";
import { KeyValueStore } from "$lib/client/components/flux/resourceStores/kv.store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import type {
  CaptureOmittedFields,
  OmitFields,
  OmitForCapture,
  OmitForCaptureWithId
} from "$lib/client/components/flux/resourceStores/resource.type";
import {
  determineResourceType,
  isSameResource,
  resourceInList
} from "$lib/client/components/flux/resourceStores/resource.utils";
import { Persistence } from "$lib/client/persistence/persistence";
import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
import {
  linker,
  linkTagStore
} from "$lib/client/products/memotron/linking/link.store";
import { nodeStore } from "$lib/client/products/memotron/node/node.store";
import {
  type IClip,
  type IClipCapture,
  type IKindleBook,
  type IKindleHighlight,
  type INode,
  type INodePropertyValue,
  type ITextClip,
  type ITweet,
  type ITwitterProfile,
  type IVideoBookmarkCapture,
  type IVideoTimestampClip,
  type IWebPage,
  type IWebScreenshotClip,
  NodeIdPrefix,
  NodeType,
  socialPostNodeTypeList,
  socialProfileNodeTypeList
} from "$lib/client/products/memotron/node/node.type";
import { generateNodeIdPrefixed } from "$lib/client/products/memotron/node/node.utils";
import {
  isSameAsCurrentUrl,
  resolveUrlData
} from "$lib/client/products/memotron/node/url.utils";
import { ObservableStore } from "$lib/client/stores/client.store";
import { appEvents } from "$lib/client/stores/notification.store";
import {
  type IRecordId,
  PersistenceActionType
} from "$lib/client/types/data.type";
import { Placement } from "$lib/client/types/direction.enum";
import { ExtensionEvent } from "$lib/client/types/extension.type";
import { AlertType } from "$lib/client/types/notification.type";

import {
  relayToBackgroundScript,
  relayToSidePanel
} from "$lib/client/utils/extension.utils";
import { activeResourceFilter } from "$lib/client/utils/utils";
import { parse, stringify } from "$lib/shared/utils/json.utils";
import { objIsEmpty, shallowDiff } from "$lib/shared/utils/obj.utils";
import { enumToString } from "$lib/shared/utils/text.utils";
import type { ISocialPost } from "../clipper.type";
import {
  extractFullTabData,
  extractMinimalTabData,
  extractYoutubeVideoData,
  resolveUrl
} from "../clipper.utils";
import {
  resolveInlineSocialPostParser,
  resolveParser,
  resolveVideoBookmarkParser
} from "../parsers";
import { captureVideoFrame } from "../parsers/shared/video.utils";
import { removeHighlight } from "./highlightV4";
import {
  type IFeedbackPaneStore,
  type ISyncStore,
  type IWebpageStore,
  SyncStatus
} from "./types";

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
      n.collections = page?.collections ?? [];
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
    contentType?: NodeType;
    creationContext?: IRecordId;
  }) {
    const contentType = params?.contentType ?? NodeType.WEB_PAGE;
    const parser = resolveParser(contentType);
    let data: OmitForCapture<IWebPage>;
    logger.debug({ at: "savePage", contentType, parser });
    if (parser) {
      const result = parser();
      if (!result) return;
      if (socialProfileNodeTypeList.has(contentType)) {
        return this.saveSocialProfile(result as IWebPage);
      } else if (socialPostNodeTypeList.has(contentType)) {
        return this.saveSocialPost({
          main: {
            ...result
          } as ISocialPost
        });
      }
    }
    data = await extractData();
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
      if (
        params?.contentType === NodeType.YOUTUBE_VIDEO ||
        params?.contentType === NodeType.YOUTUBE_SHORT
      ) {
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
  async saveClip(data: IClipCapture | IVideoBookmarkCapture) {
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
    if (clip.contentType === NodeType.WEB_SCREENSHOT) {
      feedbackPane.focus(clipNode, {
        message: "Clip saved!",
        type: AlertType.SUCCESS
      });
    }
    return clip;

    function resolveClipUrl(data: any) {
      if ("url" in data && data.url) return data.url;
      else return `${webpage.url ?? window.location.href}#${id}`;
    }
  }

  private socialIdMapper = (item: any) => {
    let id;
    if (!item) return;
    if (item.id) id = item.id;
    else if (socialProfileNodeTypeList.has(item.contentType)) {
      id = generateNodeIdPrefixed(
        item.contentType,
        item.body.username as string
      );
    } else if (socialPostNodeTypeList.has(item.contentType)) {
      id = generateNodeIdPrefixed(
        item.contentType,
        `${item.metadata.username}_${item.metadata.postId}`
      );
    } else if (!id && item.body.username) {
      id = generateNodeIdPrefixed(
        item.contentType,
        item.body.username as string
      );
    }
    return {
      ...item,
      id
    };
  };

  async saveInlineSocialPost(target: HTMLElement, contentType: NodeType) {
    const parser = resolveInlineSocialPostParser(contentType);
    logger.debug({ at: "saveInlineSocialPost", contentType, parser });
    if (!parser) {
      logger.error("No parser found for social post");
      return;
    }
    const parsed = parser(target);
    if (!parsed) {
      logger.error("Data not found");
      return;
    }
    let main;
    let posts: ISocialPost[] = [];
    if (!parsed.data || !parsed.data.url) return;
    const isMainPost = isSameAsCurrentUrl(parsed.data.url);
    if (isMainPost) {
      main = parsed;
    } else {
      if (parsed.isPostPage) {
        const mainPostResolver = resolveParser(contentType);
        main = mainPostResolver?.() as ISocialPost;
      }
      posts = [parsed];
    }
    return this.saveSocialPost({ main, posts });
  }

  /**
   * @deprecated - use savePage or saveSocialPost instead
   * @param data
   * @param isFromTweetPage
   * @returns
   */
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
      id: `${data.username}_${data.metadata?.tweetId}`
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

  focus(id: string, message: string | { message: string; type: AlertType }) {
    logger.log({ at: "focus", id, message });
    const webpage = this.get();
    if (webpage.id === id) {
      feedbackPane.toggle({ isUserInitiated: true });
    } else {
      const clip = webpage.clips?.find((c) => c.id === id);
      if (clip) {
        feedbackPane.focus(clip, message);
      }
    }
  }

  /**
   * @deprecated - use savePage or saveSocialProfile instead
   * Triggers from twitter profile page.
   * @param data
   * @returns
   */
  async saveTwitterProfile(
    data: OmitForCapture<ITwitterProfile & { username: string }>
  ) {
    const twitterProfileId = generateNodeIdPrefixed(
      NodeType.TWITTER_PROFILE,
      data.username as string
    );
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

  private async saveSocialPost(params: {
    main?: ISocialPost;
    posts?: ISocialPost[];
  }) {
    if (!params.posts && !params.main) return;
    logger.debug({ at: "saveSocialPost", params });
    let posts =
      params.posts
        ?.map((x) => x.data)
        ?.filter(Boolean)
        ?.map(this.socialIdMapper) ?? [];
    const profiles =
      params.posts
        ?.map((x) => x.parent)
        ?.filter(Boolean)
        ?.map(this.socialIdMapper) ?? [];
    const subs =
      params.posts
        ?.map((x) => x.sub)
        ?.filter(Boolean)
        ?.map(this.socialIdMapper) ?? [];
    posts = posts.map((x, index) => ({ ...x, parent: profiles[index].id }));
    const mainParent = params.main
      ? this.socialIdMapper(params.main.parent)
      : null;
    let mainPost = params.main
      ? { ...this.socialIdMapper(params.main.data), parent: mainParent?.id }
      : null;
    if (mainPost && posts.length > 0) {
      const threadRelationId = await linkTagStore.save("thread", "social");
      const content = {
        tags:
          !Array.isArray(threadRelationId) && threadRelationId?.id
            ? [threadRelationId?.id]
            : []
      };
      for (const post of posts) {
        await linker.link(post.id, mainPost.id, {
          content
        });
      }
    }
    if (posts.length > 0 && subs.length > 0) {
      const subRelationId = await linkTagStore.save("sub", "social");
      const content = {
        tags:
          !Array.isArray(subRelationId) && subRelationId?.id
            ? [subRelationId?.id]
            : []
      };
      for (const [index, post] of posts.entries()) {
        const sub = subs[index];
        if (sub)
          await linker.link(post.id, sub.id, {
            content
          });
      }
    }
    if (mainPost) {
      const genericData = extractMinimalTabData();
      mainPost = {
        ...genericData,
        ...mainPost,
        metadata: {
          ...genericData.metadata,
          ...(mainPost?.metadata ?? {})
        }
      };
    }
    logger.debug({ at: "saveSocialPost", mainPost });
    const main = mainPost ? [mainPost, mainParent] : [];
    const response = await nodeStore.create([
      ...main,
      ...posts,
      ...profiles,
      ...subs
    ]);
    if (!response || !Array.isArray(response)) return;
    this.update((n) => {
      n.clips = [
        ...(n.clips ?? []),
        ...posts.map((x) => ({ ...x, links: [] })),
        ...(mainPost ? [{ ...mainPost, links: [] }] : [])
      ];
      if (mainPost) n.id = mainPost.id;
      return n;
    });

    if (posts[0]) {
      feedbackPane.focus(posts[0], {
        message: "Post saved!",
        type: AlertType.SUCCESS
      });
      return posts[0];
    } else if (mainPost) {
      relayToSidePanel({
        event: ExtensionEvent.PAGE_STATE,
        data: {
          page: this.get(),
          toolbar: toolbarState.get()
        }
      });
      feedbackPane.focus(mainPost, {
        message: "Post saved!",
        type: AlertType.SUCCESS
      });
      return mainPost;
    }
  }

  private async saveSocialProfile(data: OmitForCapture<INode>) {
    if (!data.body.username) return;
    const profileId = generateNodeIdPrefixed(
      data.contentType,
      data.body.username
    );
    const genericData = extractMinimalTabData();
    const profile = {
      ...genericData,
      ...data,
      metadata: {
        ...genericData.metadata,
        ...(data?.metadata ?? {})
      }
    };
    logger.debug({ at: "saveSocialProfile", profile, profileId });
    const response = await nodeStore.create([{ ...data, id: profileId }]);
    if (!response || !Array.isArray(response)) return;
    const node = response[0] as INode;
    this.update((n) => {
      n.clips = [...(n.clips ?? []), { ...node, links: [] }];
      n.id = node.id;
      return n;
    });
    feedbackPane.focus(node, {
      message: `${enumToString(data.contentType)} saved!`,
      type: AlertType.SUCCESS
    });
    return node;
  }

  /**
   * Saves a video bookmark from video platforms (YouTube, Coursera, Udemy)
   * Uses platform-specific parsers to extract video metadata and current timestamp
   * Follows the same pattern as social post clipping with content type detection
   */
  saveVideoBookmark(contentType: NodeType) {
    const parser = resolveVideoBookmarkParser(contentType);
    if (!parser) {
      throw new Error("No video bookmark parser found for content type");
    }
    logger.debug({
      at: "saveVideoBookmark",
      parser,
      contentType
    });

    const bookmarkData = parser();
    if (!bookmarkData) {
      throw new Error("Failed to extract video bookmark data");
    }

    const dataUrl = captureVideoFrame();
    const uploadPromise = relayToBackgroundScript({
      event: ExtensionEvent.UPLOAD_FILE,
      data: { dataUrl, contentType: "image/png" }
    });
    return [this.saveClip(bookmarkData), uploadPromise];
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
      this.refreshClip(from);
      if (resourceType === Resource.collection) {
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
      this.refreshClip(from);
      if (resourceType === Resource.collection) {
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
    this.update((n) => {
      n.clips = n.clips?.map((x) => {
        if (isSameResource(x.id, id)) {
          x.body.highlighterId = highlighterId;
          return x;
        }
        return x;
      });
      return n;
    });
    this.refreshClip(id);

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
    const changedProperties: any = {};
    if (this.previousValue) {
      const differences = shallowDiff(newValue, parse(this.previousValue));
      differences.forEach((key: string) => {
        changedProperties[key] = newValue[key as keyof IWebpageStore];
      });
    }
    // console.log({
    //   previousValue: this.previousValue ? parse(this.previousValue) : null,
    //   newValue,
    //   changedProperties
    // });
    this._set(newValue);
    this.previousValue = stringify(newValue);
    if (!objIsEmpty(changedProperties) && changedProperties.notes) {
      this._persistNotes(newValue.id, newValue.notes);
    }
  }

  async persistPageNotes(
    notes: string,
    params?: { isFromSidePanel?: boolean }
  ) {
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
          c.notes = notes;
          return c;
        }
        return c;
      });
      return n;
    });
    this.refreshClip(id, params?.isFromSidePanel);
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
    this.refreshClip(id, params?.isFromSidePanel);
    return response;
  }

  async updateClipBody(
    id: IRecordId,
    body: any,
    params?: {
      isFromSidePanel?: boolean;
    }
  ) {
    const clip = this.get().clips?.find(resourceInList(id));
    if (!clip) return;
    const response = await nodeStore.modify(id, {
      body: { ...clip.body, ...body }
    });
    if (!response) return;
    this.update((n) => {
      n.clips = n.clips?.map((c) => {
        if (isSameResource(c, id)) {
          c.body = { ...clip.body, ...body };
          return c;
        }
        return c;
      });
      return n;
    });
    this.refreshClip(id, params?.isFromSidePanel);
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
    this.refreshClip(id, params?.isFromSidePanel);
    return response;
  }

  private updateProperties(id: IRecordId, properties: INodePropertyValue[]) {
    return nodeStore.modify(id, {
      properties: [...properties]
    });
  }

  openInModal(id: string, params?: { isResumeVideoOnClose?: boolean }) {
    const clip = this.get().clips?.find(resourceInList(id));
    if (!clip) return;
    feedbackPane.openInModal({
      ...clip,
      isResumeVideoOnClose: params?.isResumeVideoOnClose
    });
  }

  private refreshClip(id: string, isFromSidePanel: boolean = false) {
    const clip = this.get().clips?.find(resourceInList(id));
    if (!isFromSidePanel) {
      relayToSidePanel({
        event: ClipperExtensionEvent.REFRESH_CLIP,
        data: { clipId: id, clip }
      });
    }
    appEvents.publish(ClipperExtensionEvent.REFRESH_CLIP, clip);
  }
}
export const webpage = new WebpageStore();

class FeedbackPaneStore extends ObservableStore<IFeedbackPaneStore> {
  constructor() {
    super("feedbackPane");
    this.set({
      isShown: false,
      feedback: "",
      focusedClip: null,
      modalClip: null
    });
  }
  reset() {
    this.update(() => {
      return {
        isShown: false,
        feedback: "",
        focusedClip: null,
        modalClip: null
      };
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
  openInModal(clip: IClip | null) {
    this.update((n) => {
      n.modalClip = clip;
      return n;
    });
  }
  closeModalClip() {
    this.update((n) => {
      n.modalClip = null;
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

  onPageSaved(message: string, type: AlertType = AlertType.SUCCESS) {
    this.update((n) => {
      n.feedback = {
        message,
        type
      };
      n.isPreventAutoClose = false;
      n.isShowStatusOnly = type !== AlertType.SUCCESS;
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

class ClipperToolbarState extends KeyValueStore<{
  /**
   * Whether the toolbar is open or collapsed
   */
  isOpen: boolean;
  /**
   * Whether the toolbar is hidden
   */
  isHidden?: boolean;
  position: Placement.Right | Placement.Left | Placement.Bottom;
}> {
  constructor() {
    super(Resource.clipperToolbarState, {
      isOpen: true,
      position: Placement.Right
    });
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
        resourceId: `kv:${Resource.clipperToolbarState}`
      }
    });
    if (result?.id) {
      this.update((n) => {
        n.isOpen = result.isOpen;
        n.position = result.position;
        return n;
      });
    }
  }
}
export const toolbarState = ClipperToolbarState.resolve(
  Resource.clipperToolbarState
);

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
    if (status === SyncStatus.SYNCED) {
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
    } catch (e) {
      logger.error(e);
    }
  }
}

export const syncStore = new SyncStore();
