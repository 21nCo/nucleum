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
  type IWebPage
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
import { nodeStore, vectorResourceStore } from "../node/node.store";
import { KeyValueStore } from "$lib/client/components/flux/resourceStores/kv.store";
import { logger } from "$lib/client/components/debug/logger.client";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import { collectionStore } from "../collection/collection.store";
import { resolveContentTypeForFile } from "./capture.utils";
import {
  ResourceAccessMode,
  type OmitForCapture
} from "$lib/client/components/flux/resourceStores/resource.type";
import type { IRecordId } from "$lib/client/types/data.type";
import {
  CollectionType,
  type ICollection,
  type ICollectionThumb
} from "../collection/collection.type";
import {
  determineResourceType,
  isSameResource,
  resourceInList
} from "$lib/client/components/flux/resourceStores/resource.utils";
import { resolveResource } from "../memotron.store";
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
import { Embed } from "$lib/client/types/context.type";
import { TacoActions } from "../taco/taco.types";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { runVectorGeneration } from "../taco/taco.store";

export const currentUserId: string = get(account)?.userInfo?.id ?? "";

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

  async saveFile(
    file: File,
    contentType?: NodeType,
    params?: {
      isPreventOpenOnSave?: boolean;
      isEmbedContext?: boolean;
      creationContext?: IRecordId;
    }
  ) {
    const response = await account.uploadFileV2(
      file.type,
      file.name,
      new Blob([file], { type: file.type })
    );
    if (!response) return;
    if (!response[0].id) return;
    const fileId = response[0].id;
    contentType = contentType ?? resolveContentTypeForFile(file);
    if (!contentType) return { error: "File type not supported" };
    const node = {
      contentType,
      file: fileId,
      label: file.name,
      creationContext: params?.isEmbedContext
        ? (params?.creationContext ?? this.get().nodeId)
        : undefined
    } as IMediaNode;
    const result = await nodeStore.create([node], {
      context: MemotronAction.CAPTURE
    });
    this.postSave(result, {
      isOpenUponSuccess: !params?.isPreventOpenOnSave,
      isEmbedContext: params?.isEmbedContext
    });
    return result?.[0];
  }

  async saveMultipleFiles(
    files: { file: File; contentType: NodeType }[],
    params?: {
      isEmbedContext?: boolean;
      creationContext?: IRecordId;
      uploadProgressId?: string;
    }
  ) {
    let nodes: OmitForCapture<IMediaNode>[] = [];
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
      const response = await account.uploadFileV2(
        item.file.type,
        item.file.name,
        new Blob([item.file], { type: item.file.type })
      );
      if (!response) continue;
      if (!response[0].id) continue;
      const fileId = response[0].id;
      const node = {
        contentType: item.contentType,
        file: fileId,
        label: item.file.name,
        creationContext: params?.isEmbedContext
          ? (params?.creationContext ?? this.get().nodeId)
          : undefined
      } as IMediaNode;
      nodes.push(node);
    }
    const result = await nodeStore.create(nodes, {
      context: MemotronAction.CAPTURE
    });
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
    }
  ) {
    const contentType = "audio/mp3";
    const id = generateResourceId(Resource.node);
    const fileName = generateSimpleRandomId();
    const result = await account.uploadFileV2(
      contentType,
      `${fileName}.mp3`,
      data
    );
    if (!result) return;
    const fileId = result[0].id;
    const node: OmitForCapture<IMediaNode> = {
      id,
      contentType: NodeType.AUDIO,
      file: fileId,
      creationContext: params?.isEmbedContext
        ? (params?.creationContext ?? this.get().nodeId)
        : undefined,
      label: `Audio Recording - ${new Date().toLocaleString()}`,
      body: {
        duration
      }
    };
    const result2 = await nodeStore.create(node, {
      context: MemotronAction.CAPTURE
    });
    await this.saveLinks(id);
    this.postSave(result2, {
      isOpenUponSuccess: !params?.isPreventOpenOnSave,
      isEmbedContext: params?.isEmbedContext
    });
    return result2?.[0];
  }

  async saveCameraCapture(data: Blob) {
    logger.debug({ at: "CaptureStore.saveCameraCapture", length: data.size });
    const contentType = "image/jpeg";
    const id = generateResourceId(Resource.node);
    const fileName = generateSimpleRandomId();
    const result = await account.uploadFileV2(
      contentType,
      `${fileName}.jpeg`,
      data
    );
    if (!result) return;
    const fileId = result[0].id;
    const node: OmitForCapture<IMediaNode> = {
      id,
      contentType: NodeType.IMAGE,
      file: fileId,
      label: `Image Capture - ${new Date().toLocaleString()}`,
      body: {}
    };
    const result2 = await nodeStore.create(node, {
      context: MemotronAction.CAPTURE
    });
    await this.saveLinks(id);
    this.postSave(result2, { isOpenUponSuccess: true });
  }

  async saveWebpage(
    text: string,
    params?: {
      isPreventOpenOnSave?: boolean;
      isEmbedContext?: boolean;
      creationContext?: IRecordId;
    }
  ) {
    let node: OmitForCapture<IWebPage> = {
      contentType: NodeType.WEB_PAGE,
      label: text.split("://").pop(),
      url: text,
      creationContext: params?.isEmbedContext
        ? (params?.creationContext ?? this.get().nodeId)
        : undefined,
      body: {
        hash: "",
        description: ""
      }
    };
    const accountVal = account.get();
    if (accountVal?.dataMode === UserDataMode.CLOUD) {
      const data = await new Persistence().retrieveUrlData(text);
      if (data?.parsedData) {
        const parsedData = data.parsedData;
        node.label = parsedData.label ?? node.label;
        node.url = parsedData.url ?? node.url;
        node.contentType = parsedData.contentType ?? node.contentType;
        node.body.description =
          parsedData.body.description ?? node.body.description;
        node.body.hash = parsedData.body.hash ?? node.body.hash;
        node.metadata = {
          ...parsedData.metadata
        };
      }
    }
    const result = await nodeStore.create(node, {
      context: MemotronAction.CAPTURE
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
    if (result.length === 1 || node.contentType === NodeType.NODULAR_MARKDOWN) {
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
        id: MemotronAction.CAPTURE,
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

  async saveLinks(rootId: IRecordId) {
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
    await nodeStore.refreshNodeAvatar(rootId, {
      collections: typedCollections
    });

    logger.log({ at: "CaptureStore.save", rootLinks, blockLinks, links });
    return linker.linkMany(links);
  }

  async saveMarkdownCapture() {
    console.time("saveMarkdownCapture");
    const val = this.get();
    //TODO - extract nodes from markdown blocks and save
    const ctx = get(context);
    console.time("metadata");
    let metadata =
      ctx.embed === Embed.HANDSET ? {} : await resolveNodeCaptureMetadata();
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
          val.rootStructure.includes(b.id)
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
      context: MemotronAction.CAPTURE
    });
    await this.saveLinks(id);
    this.postSave(result);
    runVectorGeneration();
    console.timeEnd("saveMarkdownCapture");
    return result;
  }
}

export const captureStore = new CaptureStore();
