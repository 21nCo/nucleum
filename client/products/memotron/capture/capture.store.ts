import { get } from "svelte/store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  NodeType,
  LinkType,
  type INodeItemCaptured,
  type IMediaNode,
  type INodeThumb,
  type INodePropertyValue,
  type IMediaGridItem,
  type IWebPage,
  type IAudioMetadata,
  type IImageMetadata,
  type IImageNode
} from "$lib/client/products/memotron/node/node.type";
import {
  CaptureType,
  type ICaptureStore
} from "$lib/client/products/memotron/capture/capture.type";
import account from "$lib/client/stores/account.store";
import { toasts } from "$lib/client/stores/notification.store";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import {
  generateMarkdownText,
  getMarkdownSymbolPrepended,
  resolveNodeCaptureMetadata
} from "$lib/client/products/memotron/node/node.utils";
import {
  hierarchyFactorLimit,
  nodeStore,
  vectorResourceStore
} from "../node/node.store";
import { KeyValueStore } from "$lib/client/components/flux/resourceStores/kv.store";
import { logger } from "$lib/client/components/debug/logger.client";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import { collectionStore } from "$lib/client/components/collection/collection.store";
import {
  resolveContentTypeForFile,
  resolveMultipleFilesData
} from "./capture.utils";
import {
  ResourceAccessMode,
  ResourceActionType,
  type OmitForCapture
} from "$lib/client/components/flux/resourceStores/resource.type";
import type { IRecordId } from "$lib/client/types/data.type";
import {
  CollectionType,
  type ICollection,
  type ICollectionThumb
} from "$lib/client/components/collection/collection.type";
import {
  determineResourceType,
  isSameResource,
  resourceAction,
  resourceInList
} from "$lib/client/components/flux/resourceStores/resource.utils";
import {
  MAX_FILE_SIZE_MB,
  resolveResource
} from "$lib/client/components/record/record.store";
import { fileStore } from "$lib/client/components/files/file.store";
import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
import { appStore } from "$lib/client/stores/app.store";
import { UserDataMode } from "$lib/client/types/account.type";
import { MemotronAction } from "../memotronAction.enum";
import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
import { tacoWorker } from "$lib/client/products/memotron/memotron.utils";
import { Persistence } from "$lib/client/persistence/persistence";
import view from "$lib/client/stores/view.store";
import context from "$lib/client/stores/context.store";
import { Embed, OperatingSystem } from "$lib/client/types/context.type";
import { TacoActions } from "../taco/taco.types";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { runVectorGeneration } from "../taco/taco.store";
import { fetchYouTubeMetadata, resolveUrlData } from "../node/url.utils";
import { getImageColorsFromFile } from "$lib/client/utils/ui.utils";
import { parseBuffer } from "music-metadata";
import ExifReader from "exifreader";
import { getDeviceInfo } from "$lib/client/utils/browser.utils";
import { textIsCode } from "$lib/shared/utils/text.utils";
import {
  extractRootStructure,
  extractStructureForChildren,
  textToMdBlocks
} from "$lib/client/components/markdown/markdown.utils";
import type { IBlock } from "$lib/client/components/markdown/md.type";
import { recentsStore } from "$lib/client/components/record/recent.store";
import { CollectibleStore } from "$lib/client/components/collection/collectible.store";

export const currentUserId: string = get(account)?.userInfo?.id ?? "";
const captureAction = resourceAction(Resource.node, ResourceActionType.CREATE);

function generateSeedStore(): ICaptureStore {
  const blockId = generateResourceId(Resource.node);
  const nodeId = generateResourceId(Resource.node);
  return {
    nodeId,
    refreshId: new Date().getTime(),
    label: "",
    properties: [],
    links: [],
    avatar: null,
    childrenWithStructure: [],
    rootStructure: [],
    body: {
      blocks: [
        {
          contentType: NodeType.SIMPLE_TEXT,
          body: "",
          id: blockId
        }
      ]
    }
  };
}

class CaptureStore extends KeyValueStore<ICaptureStore> {
  private saveFeedbackTimeout: NodeJS.Timeout | null = null;
  /**
   * Disabling vector generation on save for now - as it is delaying the save process significantly sometimes.
   */
  private dev_isEnableVectorGenOnSave = false;
  constructor() {
    super(Resource.capture, { ...generateSeedStore() });
  }
  set(val: ICaptureStore) {
    this.update((store) => {
      store.isRefreshing = true;
      return store;
    });
    this.modify(val, { isDebouncedPersist: true });
    if (this.saveFeedbackTimeout) clearTimeout(this.saveFeedbackTimeout);
    this.saveFeedbackTimeout = setTimeout(() => {
      this.update((store) => {
        store.isRefreshing = false;
        return store;
      });
    }, 1500);
  }
  reset() {
    logger.log({ at: "CaptureStore.reset" });
    const seedStore = generateSeedStore();
    this.modify({
      ...seedStore,
      refreshId: new Date().getTime()
    });
  }
  loader(data: any) {
    if (!data) return;
    const val = {
      ...data,
      id: Resource.capture,
      refreshId: new Date().getTime()
    };
    this.modify(val, { isPersist: false });
  }
  async onTypeSelect(val: CaptureType | IRecordId) {
    logger.log({ context: "onTypeSelect", val });
    if (!val.toString().startsWith(Resource.collection)) return;
    const type: ICollection = await collectionStore.select(val);
    if (!type) return;
    this.update((store: ICaptureStore) => {
      store.links = [
        ...(store.links ?? []),
        {
          from: "root",
          to: type.id,
          linkType: LinkType.DIRECT,
          toType: Resource.collection,
          toSubType: CollectionType.TYPED
        }
      ];
      return store;
    });
  }
  addMentionLink(
    from: IRecordId,
    to: INodeThumb | ICollectionThumb,
    params?: {
      location?: IRecordId;
      linkTags?: IRecordId[];
    }
  ) {
    return this._addLink(from, to, LinkType.MENTION, params);
  }
  removeMentionLink(from: IRecordId, to: IRecordId) {
    this.update((val) => {
      val.links = val.links?.filter(
        (link) =>
          !(isSameResource(link.from, from) && isSameResource(link.to, to))
      );
      return val;
    });
  }
  async directLink(item: IRecordId | INodeThumb | ICollectionThumb) {
    if (typeof item === "string" || "tb" in item) {
      const resource = await resolveResource(item as IRecordId);
      return this._addLink("root", resource, LinkType.DIRECT);
    } else if (typeof item !== "string") {
      return this._addLink("root", item, LinkType.DIRECT);
    }
  }

  private _addLink(
    from: IRecordId | "root",
    to: INodeThumb | ICollectionThumb,
    linkType: LinkType,
    params?: {
      location?: IRecordId;
      linkTags?: IRecordId[];
    }
  ) {
    const store = this.get();
    if (store.links?.some((link) => isSameResource(link.to, to.id))) return;
    const toType = determineResourceType(to.id);
    this.update((val) => {
      val.links = [
        ...(val.links ?? []),
        {
          from,
          to: to.id,
          linkType,
          toType: toType as Resource.node | Resource.collection,
          toSubType: ("contentType" in to ? to.contentType : to.type) as
            | NodeType
            | CollectionType,
          location: params?.location,
          tags: params?.linkTags
        }
      ];
      return val;
    });
  }

  removeDLink(id: IRecordId) {
    this.update((val) => {
      val.links = val.links?.filter((link) => !isSameResource(link.to, id));
      return val;
    });
  }

  private async parseMetadata(file: File) {
    try {
      if (file.type.startsWith("image/")) {
        let metadata: IImageMetadata = {};
        const colors = await getImageColorsFromFile(file, 10);
        const tags = await ExifReader.load(file);
        const importantMetadata = extractImportantMetadata(tags);
        metadata = {
          colors,
          ...importantMetadata
        };
        return metadata;
      }
      if (file.type.startsWith("audio/")) {
        let metadata: IAudioMetadata = {};
        // let parsedMetadata = await parseBlob(file);
        let parsedMetadata = await parseBuffer(
          new Uint8Array(await file.arrayBuffer())
        );
        if (parsedMetadata?.common) {
          let imageId: IRecordId | undefined = undefined;
          if (parsedMetadata.common.picture?.[0]?.data) {
            try {
              const imageData = parsedMetadata.common.picture[0].data;
              const imageFile = new File([imageData], file.name, {
                type: "image/jpeg"
              });
              const imageUploadResponse = await account.uploadFileV2(
                "image/jpeg",
                file.name,
                imageFile,
                {
                  isGenerateThumbnail: true
                }
              );
              if (imageUploadResponse) {
                imageId = imageUploadResponse[0].id;
              }
            } catch (e) {
              console.error(e);
            }
          }
          metadata = {
            ...parsedMetadata.common,
            ...parsedMetadata.format,
            picture: imageId
          };
        }
        return metadata;
      }
    } catch (e: any) {
      console.error("CaptureStore - parseMetadata", e);
      return;
    }

    function extractImportantMetadata(tags: any): IImageMetadata {
      return {
        deviceInfo: {
          make: tags.Make?.description,
          model: tags.Model?.description,
          software: tags.Software?.description
        },
        imageDetails: {
          width: tags["Image Width"]?.value || tags.PixelXDimension?.value || 0,
          height:
            tags["Image Height"]?.value || tags.PixelYDimension?.value || 0,
          orientation: tags.Orientation?.description,
          dateTime: tags.DateTime?.description
        },
        cameraSettings: {
          aperture: tags.FNumber?.description,
          exposureTime: tags.ExposureTime?.description,
          iso: tags.ISOSpeedRatings?.value,
          focalLength: tags.FocalLength?.description,
          flash: tags.Flash?.description
        },
        location: tags.GPSLatitude
          ? {
              latitude: tags.GPSLatitude.description,
              longitude: tags.GPSLongitude.description,
              altitude: tags.GPSAltitude?.description
            }
          : undefined
      };
    }
  }

  async saveFile(
    file: File,
    contentType?: NodeType,
    params?: {
      isPreventOpenOnSave?: boolean;
      isEmbedContext?: boolean;
      creationContext?: IRecordId;
    }
  ) {
    contentType = contentType ?? resolveContentTypeForFile(file);
    if (!contentType) return { error: "File type not supported" };
    if (contentType === NodeType.NODULAR_MARKDOWN && !params?.isEmbedContext) {
      const result = await this.saveMarkdownFromMdFile(file);
      this.postSave(result?.slice(0, 1), {
        isOpenUponSuccess: !params?.isPreventOpenOnSave,
        isEmbedContext: params?.isEmbedContext
      });
      return result?.[0];
    }
    const response = await account.uploadFileV2(
      file.type,
      file.name,
      new Blob([file], { type: file.type }),
      {
        isGenerateThumbnail: true
      }
    );
    if (!response) return;
    if (!response[0].id) return;
    const id = generateResourceId(Resource.node);
    const fileId = response[0].id;
    const metadata = await this.parseMetadata(file);
    const captureStore = this.get();
    const node = {
      id,
      contentType,
      file: fileId,
      label: file.name,
      metadata,
      properties: params?.isEmbedContext ? [] : captureStore.properties,
      creationContext: params?.isEmbedContext
        ? params?.creationContext ?? this.get().nodeId
        : undefined
    } as IMediaNode;
    const result = await nodeStore.create([node], {
      context: captureAction
    });
    if (!params?.isEmbedContext) {
      await this.saveLinks(id);
    }
    this.postSave(result, {
      isOpenUponSuccess: !params?.isPreventOpenOnSave,
      isEmbedContext: params?.isEmbedContext
    });
    return result?.[0];
  }

  async saveMarkdownFromMdFile(file: File) {
    try {
      const text = await file.text();
      return this.saveMarkdownFromText(text, file.name);
    } catch (e: any) {
      logger.error({
        at: "CaptureStore - saveMarkdownFromMdFile",
        message: e.message,
        file: file.name
      });
      return;
    }
  }

  private async saveMarkdownFromText(text: string, title?: string) {
    const blocks: IBlock[] = textToMdBlocks(text);
    const structure = extractStructureForChildren(blocks);
    const rootStructure = extractRootStructure(structure, hierarchyFactorLimit);
    const id = generateResourceId(Resource.node);
    const rootBlocks = blocks.filter((b) =>
      rootStructure.some(resourceInList(b))
    );
    const mdText = generateMarkdownText(rootBlocks);
    let root: INodeItemCaptured = {
      id,
      label: title ?? "",
      properties: [],
      body: "",
      text: mdText,
      children: rootStructure.map((x: any) => x.id),
      contentType: NodeType.NODULAR_MARKDOWN
    };
    let remainingResources: INodeItemCaptured[] = [];
    for (const block of structure) {
      const correspondingContent = blocks.find(resourceInList(block));
      let mdText = "";
      if (block.children && block.children.length > 0) {
        const childrenNodes = blocks.filter((b) =>
          block.children?.some(resourceInList(b))
        );
        mdText = generateMarkdownText(childrenNodes);
      }
      remainingResources.push({
        id: block.id,
        contentType: correspondingContent?.contentType ?? NodeType.SIMPLE_TEXT,
        body: correspondingContent?.body,
        label: correspondingContent?.label,
        text: mdText,
        creationContext: id,
        children: block.children
      });
    }
    const result: any = await nodeStore.create([root, ...remainingResources], {
      context: captureAction
    });
    return result;
  }

  async saveMarkdownFromMdFiles(files: File[]) {
    const results = await Promise.all(
      files.map((file) => this.saveMarkdownFromMdFile(file))
    );
    return results.map((x) => x?.[0]);
  }

  async saveMultipleFiles(
    files: { file: File; contentType: NodeType }[],
    params?: {
      isEmbedContext?: boolean;
      creationContext?: IRecordId;
      uploadProgressId?: string;
    }
  ) {
    if (
      files.every((x) => x.contentType === NodeType.NODULAR_MARKDOWN) &&
      !params?.isEmbedContext
    ) {
      const result = await this.saveMarkdownFromMdFiles(
        files.map((x) => x.file)
      );
      this.postSave(result, {
        isEmbedContext: params?.isEmbedContext
      });
      return result;
    }
    let nodes: OmitForCapture<IMediaNode>[] = [];
    let mdNodesResult: any[] = [];
    const captureStore = this.get();
    for (const [index, item] of files.entries()) {
      if (params?.uploadProgressId) {
        const progressElement = document.getElementById(
          params.uploadProgressId
        );
        if (progressElement) {
          progressElement.dataset.progress = `${(index + 1) / files.length}`;
          progressElement.innerHTML = `${index + 1} / ${files.length}`;
        }
      }
      if (!item.contentType) continue;
      if (
        item.contentType === NodeType.NODULAR_MARKDOWN &&
        !params?.isEmbedContext
      ) {
        const result = await this.saveMarkdownFromMdFile(item.file);
        mdNodesResult.push(result?.[0]);
        continue;
      }
      const response = await account.uploadFileV2(
        item.file.type,
        item.file.name,
        new Blob([item.file], { type: item.file.type }),
        {
          isGenerateThumbnail: true
        }
      );
      if (!response) continue;
      if (!response[0].id) continue;
      const fileId = response[0].id;
      const id = generateResourceId(Resource.node);
      const metadata = await this.parseMetadata(item.file);
      const node = {
        id,
        contentType: item.contentType,
        file: fileId,
        label: item.file.name,
        metadata,
        properties: params?.isEmbedContext ? [] : captureStore.properties,
        creationContext: params?.isEmbedContext
          ? params?.creationContext ?? this.get().nodeId
          : undefined
      } as IMediaNode;
      nodes.push(node);
    }
    const mediaNodesResult = await nodeStore.create(nodes, {
      context: captureAction
    });
    const result = [...(mediaNodesResult ?? []), ...(mdNodesResult ?? [])];
    if (!params?.isEmbedContext) {
      await this.saveLinksForMultiFileCapture(nodes);
    }
    this.postSave(result, {
      isEmbedContext: params?.isEmbedContext
    });
    return result;
  }

  updateProperty = async (property: INodePropertyValue) => {
    let properties = this.get().properties ?? [];
    properties = properties.filter((x) => !isSameResource(x, property));
    this.update((prev) => ({ ...prev, properties: [...properties, property] }));
  };

  async saveAudioRecording(
    data: Blob,
    duration: number,
    params?: {
      isPreventOpenOnSave?: boolean;
      isEmbedContext?: boolean;
      creationContext?: IRecordId;
      thumbnailBlob?: Blob;
    }
  ) {
    const contentType = "audio/mp3";
    const id = generateResourceId(Resource.node);
    const fileName = generateSimpleRandomId();
    const result = await account.uploadFileV2(
      contentType,
      `${fileName}.mp3`,
      data,
      {
        thumbnailBlob: params?.thumbnailBlob
      }
    );
    if (!result) return;
    const fileId = result[0].id;
    const metadata = await this.parseMetadata(
      new File([data], `${fileName}.mp3`, { type: contentType })
    );
    const captureStore = this.get();
    const node: OmitForCapture<IMediaNode> = {
      id,
      contentType: NodeType.AUDIO,
      file: fileId,
      metadata,
      properties: captureStore.properties,
      creationContext: params?.isEmbedContext
        ? params?.creationContext ?? this.get().nodeId
        : undefined,
      label: `Audio Recording - ${new Date().toLocaleString()}`,
      body: {
        duration
      }
    };
    const result2 = await nodeStore.create(node, {
      context: captureAction
    });
    await this.saveLinks(id);
    this.postSave(result2, {
      isOpenUponSuccess: !params?.isPreventOpenOnSave,
      isEmbedContext: params?.isEmbedContext
    });
    return result2?.[0];
  }

  /**
   *
   * Note: not opening upon save for macOS case because it is causing camera in use indicator to continue to be turned on when the camera is not in use anymore.
   * @param data
   * @param params
   * @returns
   */
  async saveCameraCapture(
    data: Blob,
    params?: {
      deviceInfo?: MediaDeviceInfo | null;
      isMediaDeviceCapture?: boolean;
    }
  ) {
    logger.debug({
      at: "CaptureStore.saveCameraCapture",
      length: data.size,
      params
    });
    const contentType = "image/jpeg";
    const id = generateResourceId(Resource.node);
    const fileName = generateSimpleRandomId();
    const result = await account.uploadFileV2(
      contentType,
      `${fileName}.jpeg`,
      data,
      {
        isGenerateThumbnail: true
      }
    );
    if (!result) return;
    const fileId = result[0].id;
    // const colors = await getImageColorsFromFile(
    //   new File([data], fileName, { type: contentType }),
    //   10
    // );
    const metadata: IImageMetadata | undefined = await this.parseMetadata(
      new File([data], fileName, { type: contentType })
    );
    const deviceInfo = await getDeviceInfo();
    const captureStore = this.get();
    const node: OmitForCapture<IImageNode> = {
      id,
      contentType: NodeType.IMAGE,
      file: fileId,
      label: `Image Capture - ${new Date().toLocaleString()}`,
      body: {},
      properties: captureStore.properties,
      metadata: {
        ...metadata,
        deviceInfo: {
          deviceLabel: params?.deviceInfo?.label,
          deviceId: params?.deviceInfo?.deviceId,
          model: metadata?.deviceInfo?.model ?? deviceInfo?.model,
          make: metadata?.deviceInfo?.make ?? deviceInfo?.make,
          platform: deviceInfo?.platform
        },
        imageDetails: {
          ...metadata?.imageDetails,
          dateTime: metadata?.imageDetails?.dateTime ?? new Date().toISOString()
        }
      }
    };
    const result2 = await nodeStore.create(node, {
      context: captureAction
    });
    await this.saveLinks(id);
    const ctx = get(context);
    if (params?.isMediaDeviceCapture && ctx.os === OperatingSystem.MACOS) {
      return result2;
    }
    this.postSave(result2, { isOpenUponSuccess: true });
  }

  async saveWebpage(
    text: string,
    params?: {
      contentType?: NodeType;
      isPreventOpenOnSave?: boolean;
      isEmbedContext?: boolean;
      creationContext?: IRecordId;
    }
  ) {
    if (params?.isEmbedContext) {
      const urlData = resolveUrlData(text);
      if (urlData?.convertToEmbedUrl) {
        text = urlData.convertToEmbedUrl(text);
      }
    }

    let node: OmitForCapture<IWebPage> = {
      contentType: params?.contentType ?? NodeType.WEB_PAGE,
      label: text.split("://").pop(),
      url: text,
      creationContext: params?.isEmbedContext
        ? params?.creationContext ?? this.get().nodeId
        : undefined,
      body: {
        hash: "",
        description: ""
      }
    };
    const accountVal = account.get();
    if (accountVal?.dataMode === UserDataMode.CLOUD) {
      if (params?.contentType === NodeType.YOUTUBE_VIDEO) {
        const youtubeMetadata = await fetchYouTubeMetadata(text);
        if (youtubeMetadata) {
          node.label = youtubeMetadata.title;
          node.metadata = {
            authorName: youtubeMetadata.author_name,
            authorUrl: youtubeMetadata.author_url,
            thumbnailUrl: youtubeMetadata.thumbnail_url
          };
        }
      } else {
        const data = await new Persistence().retrieveUrlData(text);
        console.log({ at: "saveWebpage - retrieveUrlData", data });
        if (data?.parsedData) {
          const parsedData = data.parsedData;
          node.label = parsedData.label ?? node.label;
          node.url = parsedData.url ?? node.url;
          node.contentType =
            params?.contentType ?? parsedData.contentType ?? node.contentType;
          node.body.description =
            parsedData.body.description ?? node.body.description;
          node.body.hash = parsedData.body.hash ?? node.body.hash;
          node.metadata = {
            ...parsedData.metadata
          };
        }
      }
    }
    const result = await nodeStore.create(node, {
      context: captureAction
    });
    this.postSave(result, {
      isOpenUponSuccess: !params?.isPreventOpenOnSave,
      isEmbedContext: params?.isEmbedContext
    });
    return result;
  }

  async postSave(
    result: any,
    params?: {
      isOpenUponSuccess?: boolean;
      isEmbedContext?: boolean;
    }
  ) {
    logger.debug({ at: "CaptureStore.postSave", result });
    const node = result?.[0];
    if (!result || result.error || !node || !node.id) {
      logger.error(result);
      toasts.error("Something went wrong. Please try again later.");
      return;
    }
    const viewStore = get(view);
    if (result.length === 1) {
      recentsStore.add(node, { type: Resource.node, timestamp: new Date() });
      if (!viewStore.isConstrainedWidth && !params?.isEmbedContext)
        toasts.success("Node saved successfully!");
      if (params?.isOpenUponSuccess && !params?.isEmbedContext)
        appStore.openResource(node.id, ResourceAccessMode.POP);
    } else if (!viewStore.isConstrainedWidth && !params?.isEmbedContext) {
      toasts.success(`${result.length} nodes saved successfully!`);
    }
    if (params?.isEmbedContext) return;
    if (!params?.isOpenUponSuccess) {
      appStore.closeResource({
        id: captureAction,
        accessMode: ResourceAccessMode.POP
      });
      appStore.closeResource({
        id: MemotronAction.CAPTURE_DND,
        accessMode: ResourceAccessMode.POP
      });
      appStore.closeResource({
        id: MemotronAction.CAPTURE_SECONDARY,
        accessMode: ResourceAccessMode.POP
      });
    }
    this.reset();
    // this.modify({ ...generateSeedStore() }, { isPersist: false });
  }

  private async saveLinks(rootId: IRecordId) {
    const val = this.get();
    const rootLinks = [
      ...(val.links ? val.links.filter((x) => x.from === "root") : [])
    ].map((x) => {
      return { ...x, from: rootId };
    });
    const blockLinks = val.links?.filter((x) => x.from !== "root");
    logger.log({ at: "CaptureStore.saveLinks", rootLinks, blockLinks, val });
    if (!isValidArrayWithData(rootLinks) && !isValidArrayWithData(blockLinks))
      return;
    const links = [...(rootLinks ?? []), ...(blockLinks ?? [])].map((x) => {
      return {
        in: x.from,
        out: x.to,
        linkType: x.linkType,
        toType: x.toType,
        location: x.location,
        tags: x.tags
      };
    });
    const typedCollections = val.links
      ?.filter((x) => x.from === "root" && x.toSubType === CollectionType.TYPED)
      .map((x) => x.to);
    // await nodeStore.refreshNodeAvatar(rootId, {
    //   collections: typedCollections
    // });
    const collectibleStore = new CollectibleStore({ id: rootId }, nodeStore);
    await collectibleStore.refreshAvatar(rootId, {
      collections: typedCollections
    });

    logger.log({ at: "CaptureStore.save", rootLinks, blockLinks, links });
    return linker.linkMany(links);
  }

  private async saveLinksForMultiFileCapture(nodes: any[]) {
    const val = this.get();
    const rootLinks = [
      ...(val.links ? val.links.filter((x) => x.from === "root") : [])
    ];
    if (!isValidArrayWithData(rootLinks)) return;
    let links: any[] = [];
    nodes.forEach((node) => {
      links.push(
        ...(rootLinks.map((x) => ({
          in: node.id,
          out: x.to,
          linkType: x.linkType,
          toType: x.toType,
          tags: x.tags
        })) ?? [])
      );
    });
    return linker.linkMany(links);
  }

  async saveMarkdownCapture() {
    console.time("saveMarkdownCapture");
    const val = this.get();
    //TODO - extract nodes from markdown blocks and save
    const ctx = get(context);
    console.time("metadata");
    let metadata = ctx.isEmbed ? {} : await resolveNodeCaptureMetadata();
    console.timeEnd("metadata");
    logger.log({ at: "CaptureStore.saveMarkdownCapture", val, metadata });
    // const id = prefixTable(generateRandomId(), Resource.node);
    const id = val.nodeId ?? generateResourceId(Resource.node);
    let root: INodeItemCaptured = {
      id,
      label: val.label ?? "",
      properties: val.properties,
      body: "",
      contentType: NodeType.NODULAR_MARKDOWN,
      metadata
    };
    let remainingResources: INodeItemCaptured[] = [];
    if ("blocks" in val.body) {
      let data;
      let contentType;
      let name;
      for (let block of val.body.blocks) {
        if (block.contentType === NodeType.MEDIA_GRID) {
          let files = await fileStore.selectMany({
            filters: { id: block.body.items.map((item) => item.file) }
          });
          for (let item of block.body.items) {
            item = item as IMediaGridItem;
            const file = files.find(resourceInList(item.file));
            if (!file) continue;
            data = await fetch(file.url).then((r) => r.blob());
            contentType = file.type;
            name = file.name;
            const result = await account.uploadFileV2(contentType, name, data);
            if (result) {
              item.file = result[0].id;
            }
          }
        }
      }
      let mdText = "";
      let vectorInsertionresult: any;
      if (val.rootStructure.length > 0) {
        const rootBlocks = val.body.blocks.filter((b) =>
          val.rootStructure.some(resourceInList(b))
        );
        console.time("generateMarkdownText");
        mdText = generateMarkdownText(rootBlocks);
        console.timeEnd("generateMarkdownText");

        if (
          get(userPreferences).localAI.semanticSearch &&
          ctx.embed !== Embed.HANDSET &&
          this.dev_isEnableVectorGenOnSave
        ) {
          console.time("vector");
          try {
            console.time("tacoWorker");

            const eventId = val.id.toString();
            tacoWorker.postMessage({
              action: TacoActions.GET_EMBEDDINGS,
              params: {
                text: val.label + " \n" + mdText,
                eventId
              }
            });
            const embedding: any = await new Promise((resolve, reject) => {
              const handleMessage = (e) => {
                const { eventId: recEventId, data } = e.data;
                if (eventId == recEventId) {
                  tacoWorker.removeEventListener("message", handleMessage);
                  resolve(data);
                }
              };
              tacoWorker.addEventListener("message", handleMessage);
            });
            console.timeEnd("tacoWorker");
            vectorInsertionresult = await vectorResourceStore.create({
              id: generateResourceId(Resource.vector),
              embedding: embedding,
              node: id
            });
            console.timeEnd("vector");
          } catch (e) {
            logger.error({
              at: "CaptureStore.saveMarkdownCapture - vector generation error",
              error: e
            });
          }
        }
      }
      root = {
        ...root,
        children: val.rootStructure,
        text: mdText,
        vector: vectorInsertionresult?.[0]?.id
      };

      console.time("children");
      for (let block of val.childrenWithStructure) {
        const correspondingContent = val.body.blocks.find(
          (b) => b.id === block.id
        );
        //TODO - links for each block
        let mdText = "";
        let vectorInsertionresult: any;
        if (block.children && block.children.length > 0) {
          const childrenNodes = val.body.blocks.filter((b) =>
            block.children?.includes(b.id)
          );
          mdText = generateMarkdownText(childrenNodes);

          if (
            get(userPreferences).localAI.semanticSearch &&
            ctx.embed !== Embed.HANDSET &&
            this.dev_isEnableVectorGenOnSave
          ) {
            try {
              const eventId = block.id.toString();
              tacoWorker.postMessage({
                action: TacoActions.GET_EMBEDDINGS,
                params: {
                  text:
                    getMarkdownSymbolPrepended(correspondingContent!) +
                    " \n" +
                    mdText,
                  eventId
                }
              });
              const embedding: any = await new Promise((resolve, reject) => {
                const handleMessage = (e) => {
                  const { eventId: recEventId, data } = e.data;
                  if (eventId == recEventId) {
                    tacoWorker.removeEventListener("message", handleMessage);
                    resolve(data);
                  }
                };
                tacoWorker.addEventListener("message", handleMessage);
              });
              vectorInsertionresult = await vectorResourceStore.create({
                id: generateResourceId(Resource.vector),
                embedding: embedding,
                node: block.id
              });
            } catch (e) {
              logger.error({
                at: "CaptureStore.saveMarkdownCapture - vector generation error",
                error: e
              });
            }
          }
        }
        remainingResources.push({
          id: block.id,
          contentType: correspondingContent?.contentType,
          body: correspondingContent?.body,
          label: correspondingContent?.label,
          text: mdText,
          vector:
            vectorInsertionresult?.length > 0
              ? vectorInsertionresult[0]?.id
              : null,
          metadata: correspondingContent?.metadata,
          creationContext: id,
          children: block.children
        });
      }
      console.timeEnd("children");
    }

    let result: any = await nodeStore.create([root, ...remainingResources], {
      context: captureAction
    });
    await this.saveLinks(id);
    this.postSave(result.slice(0, 1));
    runVectorGeneration();
    console.timeEnd("saveMarkdownCapture");
    return result;
  }
}

export const captureStore = new CaptureStore();
