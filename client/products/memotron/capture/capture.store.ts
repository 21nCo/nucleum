import { get } from "svelte/store";
import { Item } from "$lib/client/types/item.enum";
import type { IProperty } from "$lib/client/types/memotron/type.type";
import {
  StoreDataType
} from "$lib/client/types/data.type";
import {
  NodeType,
  type LinkThumbnail,
  type INodeCapture,
  LinkType,
  type INodeItemCaptured,
} from "$lib/client/types/memotron/node.type";
import {
  CaptureType,
  type ICaptureStore,
  type FileDetails
} from "$lib/client/types/memotron/capture.type";
import { AlertType } from "$lib/client/types/notification.type";
import {
  generateUID,
  interceptSurrealResponse
} from "$lib/client/utils/utils";
import {  isValidArrayWithData } from "$lib/client/utils/obj.utils";
import { resolvePropertyDefaultValue } from "../common/properties/property.utils";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import { dataManager } from "$lib/client/persistence/dataManager";
import account from "$lib/client/stores/account.store";
import { toasts } from "$lib/client/stores/notification.store";
import { prefixTable } from "$lib/client/utils/text.utils";
import { resolveNodeCaptureMetadata } from "$lib/client/products/memotron/node/node.utils";
import { nodeStore } from "../node/node.store";
import { KeyValueStore } from "$lib/client/stores/kv.store";

export const currentUserId: string = get(account)?.userInfo?.id ?? "";

function generateSeedStore(): ICaptureStore {
  const blockId = prefixTable(generateUID(), Item.node);
  return {
    id: Item.capture,
    dataType: StoreDataType.KVO,
    captureType: CaptureType.MARKDOWN,
    refreshId: new Date().getTime(),
    type: null,
    label: "",
    properties: [],
    fileDetails: undefined,
    directLinks: [],
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


/**
 * Filters properties that are marked for capture
 * @param properties
 * @returns
 */
function resolvePropertiesForCapture(properties: IProperty[]) {
  if (!isValidArrayWithData(properties)) return [];
  return properties
    .filter((item: IProperty) => {
      return item.isShowOnCapture;
    })
    .map((y) => {
      return { id: y.id, value: resolvePropertyDefaultValue(y) };
    });
}

class CaptureStore extends KeyValueStore<ICaptureStore> {
  constructor() {
    super(
      Item.capture,
      { ...generateSeedStore() },
      {
        priorityRefreshOnAppAppear: true,
        isSynchronousCache: true
      }
    );
  }
  set(val: ICaptureStore) {
    this.modify(val, {isDebouncedPersist: true});
  }
  reset() {
    const seedStore = generateSeedStore();
    this.modify({ ...seedStore, refreshId: new Date().getTime() });
  }
  loader(data: any) {
    if (!data) return;
    const val = {
      ...data,
      id: Item.capture,
      refreshId: new Date().getTime()
    };
    this.modify(val, {isPersist: false});
  }
  //TODO - delegate type fetch operation to typeStore and remove SurrealDatabase dependency
  async onTypeSelect(val: CaptureType | string) {
    if (!val.startsWith("type:")) return;
    const type = await get(dataManager).cacheSource.dexie.type.get(val);
    if (!type) return;
    this.update((store: ICaptureStore) => {
      store.type = type;
      store.properties = resolvePropertiesForCapture(store.type.properties);
      return store;
    });
    const db = new SurrealDatabase();
    db.executeReadFn("return fn::memotron::type::fetch($id)", {
      id: type.id
    }).then((res) => {
      const result = interceptSurrealResponse(res);
      if (!isValidArrayWithData(result)) return;
      this.update((store: ICaptureStore) => {
        store.type = result[0];
        store.properties = resolvePropertiesForCapture(store.type.properties);
        return store;
      });
    });
  }
  addMentionLink(from: string, to: string) {
    this.update((val) => {
      val.links = val.links ?? [];
      val.links.push({ from, to, linkType: LinkType.MENTION });
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
  directLink(item: LinkThumbnail) {
    this.update((val) => {
      val.directLinks = val.directLinks ?? [];
      val.directLinks.push({ ...item, linkType: LinkType.DIRECT });
      return val;
    });
  }
  removeDLink(id: string) {
    this.update((val) => {
      val.directLinks = val.directLinks?.filter((link) => link.id !== id);
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
  const id = prefixTable(generateUID(), Item.node);
  let root: INodeItemCaptured = {
    id,
    label: val.label ?? "",
    properties: val.properties,
    type: val.type?.id,
    body: "",
    contentType:
      val.captureType === CaptureType.AUDIO
        ? NodeType.AUDIO
        : val.captureType === CaptureType.CAMERA
          ? NodeType.IMAGE
          : val.captureType === CaptureType.MARKDOWN
            ? NodeType.NODULAR_MARKDOWN
            : val.captureType.includes("type:")
              ? NodeType.NODULAR_MARKDOWN
              : NodeType.SIMPLE_TEXT,
    metadata,
    links: [
      ...(val.directLinks?.map((link) => {
        return { from: id, to: link.id, linkType: link.linkType };
      }) ?? []),
      ...(val.links ?? [])
    ]
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
  let nodeCapture: INodeCapture = {
    resources: [root, ...remainingResources]
  };
  console.log({ nodeToBeSaved: nodeCapture });
  let result = await nodeStore.createNode(nodeCapture);
  if (result) {
    this.modify({ ...generateSeedStore() }, {isPersist: false});
    toasts.trigger({
      id: generateUID(),
      type: AlertType.SUCCESS,
      title: "Saved",
      message: "Node saved successfully"
    });
    return result;
  } else {
    toasts.trigger({
      id: generateUID(),
      type: AlertType.ERROR,
      message: "Error saving"
    });
    return null;
  }
  }
}

export const captureStore = new CaptureStore();