import { get } from "svelte/store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  NodeType,
  LinkType,
  type INodeItemCaptured,
  type IMediaNode,
  type INodeThumb,
  type INodePropertyValue,
  type IMediaGridItem
} from "$lib/client/products/memotron/node/node.type";
import {
  CaptureType,
  type ICaptureStore,
  type FileDetails
} from "$lib/client/products/memotron/capture/capture.type";
import account from "$lib/client/stores/account.store";
import { toasts } from "$lib/client/stores/notification.store";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import {
  generateMarkdownText,
  resolveNodeCaptureMetadata
} from "$lib/client/products/memotron/node/node.utils";
import { nodeStore, vectorResourceStore } from "../node/node.store";
import { KeyValueStore } from "$lib/client/components/flux/resourceStores/kv.store";
import { logger } from "$lib/client/components/debug/logger.client";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import { collectionStore } from "../collection/collection.store";
import { resolveContentTypeForFile } from "./capture.utils";
import type { OmitForCapture } from "$lib/client/components/flux/resourceStores/resource.type";
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
import { FeatureExtractor } from "$lib/client/utils/taco.utils";
import { fileStore } from "$lib/client/components/files/file.store";
import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
import { tacoWorker } from "$lib/client/products/memotron/memotron.store";
import { TacoActions } from "$lib/client/types/taco.types";

export const currentUserId: string = get(account)?.userInfo?.id ?? "";

function generateSeedStore(): ICaptureStore {
  const blockId = generateResourceId(Resource.node);
  return {
    captureType: CaptureType.MARKDOWN,
    refreshId: new Date().getTime(),
    label: "",
    properties: [],
    fileDetails: null,
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
  addMentionLink(from: IRecordId, to: INodeThumb | ICollectionThumb) {
    return this._addLink(from, to, LinkType.MENTION);
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
    linkType: LinkType
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
            | CollectionType
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
  setFile(fileDetails: FileDetails | null) {
    this.update((val) => {
      if (fileDetails) val.fileDetails = fileDetails;
      else val.fileDetails = undefined;
      return val;
    });
  }

  async saveFile(file: File, contentType?: NodeType) {
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
      label: file.name
    } as IMediaNode;
    const result = await nodeStore.create([node]);
    return result?.[0];
  }

  async saveMultipleFiles(files: { file: File; contentType: NodeType }[]) {
    let nodes: OmitForCapture<IMediaNode>[] = [];
    for (const item of files) {
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
        label: item.file.name
      } as IMediaNode;
      nodes.push(node);
    }
    return nodeStore.create(nodes);
  }

  updateProperty = async (property: INodePropertyValue) => {
    let properties = this.get().properties ?? [];
    properties = properties.filter((x) => !isSameResource(x, property));
    this.update((prev) => ({ ...prev, properties: [...properties, property] }));
  };

  async save() {
    const val = this.get();
    //TODO - extract nodes from markdown blocks and save
    const metadata = await resolveNodeCaptureMetadata();
    console.log("capture store", { val, metadata });
    // const id = prefixTable(generateRandomId(), Resource.node);
    const id = generateResourceId(Resource.node);
    let root: INodeItemCaptured = {
      id,
      label: val.label ?? "",
      properties: val.properties,
      body: "",
      contentType: getContentTypeFromFileDetails(),
      metadata
    };
    let remainingResources: INodeItemCaptured[] = [];
    if (val.fileDetails) {
      const contentType = val.fileDetails.type;
      // const blob = new Blob(val.fileDetails.data, {
      //   type: contentType,
      // });
      const result = await account.uploadFileV2(
        contentType,
        val.fileDetails.name,
        val.fileDetails.data
      );
      console.log("save file:", { result });
      if (result) {
        delete val.fileDetails.pdfAnnotations;
        root = {
          ...root,
          body: {
            duration: val.fileDetails.duration
          },
          file: result[0].id
        };
      }
    } else if ("blocks" in val.body) {
      let data;
      let contentType;
      let name;
      /**
       * When media grid is used in capture page we store the media in temp s3 storage , here before saving the capture to db we are sotring the medias in persistent s3 storage
       */
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
        mdText = generateMarkdownText(rootBlocks);
        if (get(userPreferences).LocalAI.semanticSearch) {
          tacoWorker.postMessage({
            action: TacoActions.GET_EMBEDDINGS,
            params: {
              text: mdText
            }
          });
          const embedding = await new Promise((resolve, reject) => {
            tacoWorker.onmessage = (e) => {
              resolve(e.data);
            };
          });
          vectorInsertionresult = await vectorResourceStore.create({
            id: generateResourceId(Resource.vector),
            embedding: embedding,
            node: id
          });
        }
        //TODO - AI enabling setting - local AI
        // const embedding =
        //   await FeatureExtractor.generateVectorEmbeddings(mdText);
        // vectorInsertionresult = await vectorResourceStore.create({
        //   id: generateResourceId(Resource.vector),
        //   embedding: embedding,
        //   node: id
        // });
        // console.log("vector result", vectorInsertionresult);
      }
      root = {
        ...root,
        children: val.rootStructure,
        mdText,
        vector: vectorInsertionresult?.[0]?.id
      };

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
          const embedding =
            await FeatureExtractor.generateVectorEmbeddings(mdText);
          vectorInsertionresult = await vectorResourceStore.create({
            id: generateResourceId(Resource.vector),
            embedding: embedding,
            node: block.id
          });
          // console.log("vector2", vector);
        }
        remainingResources.push({
          id: block.id,
          contentType: correspondingContent.contentType,
          body: correspondingContent.body,
          mdText,
          vector:
            vectorInsertionresult?.length > 0
              ? vectorInsertionresult[0]?.id
              : null,
          metadata: root.metadata,
          creationContext: id,
          children: block.children
        });
      }

      // remainingResources = val.childrenWithStructure.map((block) => {
      //   const correspondingContent = val.body.blocks.find(
      //     (b) => b.id === block.id
      //   );
      //   //TODO - links for each block
      //   let mdText = "";
      //   let vector: any = null;
      //   if (block.children && block.children.length > 0) {
      //     const childrenNodes = val.body.blocks.filter((b) =>
      //       block.children?.includes(b.id)
      //     );
      //     mdText = generateMarkdownText(childrenNodes);
      //     // vector = await extract(mdText);
      //     // console.log("vector2", vector);
      //   }
      //   return {
      //     id: block.id,
      //     contentType: correspondingContent.contentType,
      //     body: correspondingContent.body,
      //     mdText,
      //     // vector,
      //     metadata: root.metadata,
      //     creationContext: id,
      //     children: block.children
      //   };
      // });
    }
    if (root.contentType == NodeType.PDF)
      root = { ...root, url: root.body.url };

    let result: any = await nodeStore.create([root, ...remainingResources]);
    logger.log({ at: "CaptureStore.save", result });
    //TODO - save links
    const rootLinks = [
      ...(val.links ? val.links.filter((x) => x.from === "root") : [])
    ].map((x) => {
      return { ...x, from: id };
    });
    const blockLinks = val.links?.filter((x) => x.from !== "root");
    if ((blockLinks && blockLinks.length > 0) || rootLinks?.length > 0) {
      const links = [...rootLinks, ...(blockLinks ?? [])].map((x) => {
        return {
          in: x.from,
          out: x.to,
          linkType: x.linkType,
          toType: x.toType
        };
      });
      logger.log({ at: "CaptureStore.save", rootLinks, blockLinks, links });
      await linker.linkMany(links);
    }

    if (!result) {
      toasts.error("Something went wrong. Please try again later.");
      return null;
    }
    if (
      root.contentType == NodeType.PDF &&
      val.fileDetails?.pdfAnnotations?.length != 0
    ) {
      let pdfAnnotations = val.fileDetails?.pdfAnnotations;
      const parentId = root.id;
      pdfAnnotations = pdfAnnotations?.map((annot) => {
        const { id, ...remainingItems } = annot;
        return {
          body: { ...remainingItems },
          contentType: NodeType.PDF_CLIP,
          parent: parentId
        };
      });
      //TODO - test nodeStore.create method
      // await surrealPDF.saveAllClips(pdfAnnotations!);
      nodeStore.create(pdfAnnotations);
    }
    this.modify({ ...generateSeedStore() }, { isPersist: false });
    toasts.success("Node saved successfully!");
    return result;

    function getContentTypeFromFileDetails() {
      if (!val?.captureType) return NodeType.NODULAR_MARKDOWN;
      if (val.captureType.toString().includes("collection:")) {
        //TODO - based on content template
        return NodeType.NODULAR_MARKDOWN;
      }
      switch (val.captureType) {
        case CaptureType.MARKDOWN:
          return NodeType.NODULAR_MARKDOWN;
        case CaptureType.AUDIO:
          return NodeType.AUDIO;
        case CaptureType.CAMERA:
          return NodeType.IMAGE;
        default:
          return NodeType.SIMPLE_TEXT;
      }
    }
  }
}

export const captureStore = new CaptureStore();
