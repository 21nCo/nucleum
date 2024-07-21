import { get } from "svelte/store";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import {
  NodeType,
  LinkType,
  type INodeItemCaptured
} from "$lib/client/products/memotron/node/node.type";
import {
  CaptureType,
  type ICaptureStore,
  type FileDetails
} from "$lib/client/products/memotron/capture/capture.type";
import { AlertType } from "$lib/client/types/notification.type";
import { generateUID } from "$lib/client/utils/utils";
import { dataManager } from "$lib/client/persistence/dataManager";
import account from "$lib/client/stores/account.store";
import { toasts } from "$lib/client/stores/notification.store";
import { prefixTable } from "$lib/shared/utils/text.utils";
import { resolveNodeCaptureMetadata } from "$lib/client/products/memotron/node/node.utils";
import { nodeStore } from "../node/node.store";
import { KeyValueStore } from "$lib/client/components/resourceStores/kv.store";
import { logger } from "$lib/client/stores/log.store";
import { MemotronResourceType } from "$lib/client/products/memotron/memotron.type";
import { resolveResourceType } from "../memotron.utils";

export const currentUserId: string = get(account)?.userInfo?.id ?? "";

function generateSeedStore(): ICaptureStore {
  const blockId = prefixTable(generateUID(), Resource.node);
  return {
    captureType: CaptureType.MARKDOWN,
    refreshId: new Date().getTime(),
    label: "",
    properties: [],
    fileDetails: undefined,
    links: [],
    avatar: undefined,
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
  constructor() {
    super(
      Resource.capture,
      { ...generateSeedStore() },
      {
        priorityRefreshOnAppAppear: true,
        isSynchronousCache: true
      }
    );
  }
  set(val: ICaptureStore) {
    this.modify(val, { isDebouncedPersist: true });
  }
  reset() {
    const seedStore = generateSeedStore();
    this.modify({ ...seedStore, refreshId: new Date().getTime() });
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
  async onTypeSelect(val: CaptureType | string) {
    logger.log({ context: "onTypeSelect", val });
    if (!val.startsWith(Resource.collection)) return;
    const dexie = get(dataManager).cacheSource.dexie;
    const type = await dexie.collection.get(val);
    if (!type) return;
    this.update((store: ICaptureStore) => {
      store.links = [
        ...(store.links ?? []),
        {
          from: "root",
          to: type.id,
          linkType: LinkType.DIRECT,
          toType: MemotronResourceType.TYPED_COLLECTION
        }
      ];
      return store;
    });
  }
  addMentionLink(from: string, to: string) {
    this.update((val) => {
      val.links = val.links ?? [];
      val.links.push({
        from,
        to,
        linkType: LinkType.MENTION,
        toType: undefined
      });
      return val;
    });
  }
  removeMentionLink(from: string, to: string) {
    this.update((val) => {
      val.links = val.links?.filter(
        (link) => link.from !== from || link.to !== to
      );
      return val;
    });
  }
  directLink(item: any) {
    const toType = resolveResourceType(item);
    console.log("directLink", { item, toType });
    this.update((val) => {
      val.links = [
        ...(val.links ?? []),
        {
          from: "root",
          to: item.id,
          linkType: LinkType.DIRECT,
          toType
        }
      ];
      return val;
    });
  }
  removeDLink(id: string) {
    this.update((val) => {
      val.links = val.links?.filter((link) => link.to !== id);
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

  async save() {
    const val = this.get();
    //TODO - extract nodes from markdown blocks and save
    const metadata = await resolveNodeCaptureMetadata();
    console.log("capture store", { val, metadata });
    const id = prefixTable(generateUID(), Resource.node);
    let root: INodeItemCaptured = {
      id,
      label: val.label ?? "",
      properties: val.properties,
      body: "",
      contentType: getContentTypeFromFileDetails(val?.fileDetails!),
      metadata,
      links: [...(val.links ? val.links.filter((x) => x.from === "root") : [])]
    };
    let remainingResources: INodeItemCaptured[] = [];
    if (val.fileDetails) {
      const contentType = val.fileDetails.type;
      // const blob = new Blob(val.fileDetails.data, {
      //   type: contentType,
      // });
      const result = await account.uploadFile(
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
            ...val.fileDetails,
            ...result,
            url: result.uploadURL.split("?")[0]
          }
        };
      }
    } else if ("blocks" in val.body) {
      root = {
        ...root,
        children: val.rootStructure
      };
      remainingResources = val.childrenWithStructure.map((block) => {
        const correspondingContent = val.body.blocks.find(
          (b) => b.id === block.id
        );
        //TODO - links for each block
        return {
          id: block.id,
          contentType: correspondingContent.contentType,
          body: correspondingContent.body,
          metadata: root.metadata,
          creationContext: root.id,
          children: block.children,
          links: []
        };
      });
    }
    if (root.contentType == NodeType.PDF)
      root = { ...root, url: root.body.url };

    let result: any = await nodeStore.createNode([root, ...remainingResources]);

    if (!result) {
      toasts.trigger({
        id: generateUID(),
        type: AlertType.ERROR,
        message: "Error saving"
      });
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
    toasts.trigger({
      id: generateUID(),
      type: AlertType.SUCCESS,
      title: "Saved",
      message: "Node saved successfully"
    });
    return result;

    function getContentTypeFromFileDetails(fileDetails: FileDetails) {
      if (val.captureType === CaptureType.UPLOAD) {
        const contentType = fileDetails.type;
        if (contentType.includes("image")) return NodeType.IMAGE;
        else if (contentType.includes("audio")) return NodeType.AUDIO;
        else if (contentType.includes("video")) return NodeType.VIDEO;
        else if (contentType.includes("pdf")) return NodeType.PDF;
        else return NodeType.FILE;
      } else if (val.captureType.includes("collection:")) {
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
