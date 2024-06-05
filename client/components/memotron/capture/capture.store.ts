import { get, writable } from "svelte/store";
import { Item } from "$lib/client/types/item.enum";
import type { IProperty } from "$lib/client/types/memotron/type.type";
import {
  PersistanceActionType,
  StoreDataType
} from "$lib/client/types/data.type";
import { CurationType } from "$lib/client/types/memotron/curation.type";
import {
  NodeType,
  type LinkThumbnail,
  type INodeCapture,
  LinkType,
  type INodeProperty,
  type INodeItemCaptured
} from "$lib/client/types/memotron/node.type";
import {
  CaptureType,
  type CaptureStore,
  type FileDetails
} from "$lib/client/types/memotron/capture.type";
import { AlertType } from "$lib/client/types/notification.type";
import {
  activeResourceFilter,
  debouncer,
  generateUID,
  interceptSurrealResponse
} from "$lib/client/utils/utils";
import { deepCopy, isValidArrayWithData } from "$lib/client/utils/obj.utils";
import { resolvePropertyDefaultValue } from "../common/properties/property.utils";
import {
  persistLocally,
  retrieveLocally
} from "$lib/client/utils/storage.utils";
import { SurrealDatabase } from "$lib/client/access/surrealHelper";
import { dataManager } from "$lib/client/stores/data.store";
import account from "$lib/client/stores/account.store";
import { toasts } from "$lib/client/stores/notification.store";
import { NodePersistance } from "$lib/client/stores/node.persistance";
import { prefixTable } from "$lib/client/utils/text.utils";
import { resolveNodeCaptureMetadata } from "$lib/client/utils/node.utils";

const currentUserId: string = get(account)?.userInfo?.id ?? "";

function generateSeedStore(): CaptureStore {
  const blockId = prefixTable(generateUID(), Item.node);
  return {
    id: Item.capture,
    dataType: StoreDataType.KVO,
    captureType: CaptureType.MARKDOWN,
    refreshId: new Date().getTime(),
    type: null,
    label: "",
    properties: [],
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
const locallyPersistedCapture = retrieveLocally(Item.capture);

export const captureStore = initCaptureStore();

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

/**
 * Sets the type on type select event.
 * @param updater store updater function
 * @param val
 * @returns
 */
async function onTypeSelect(updater: any, val: CaptureType | string) {
  if (!val.startsWith("type:")) return;
  const type = await get(dataManager).cacheSource.dexie.type.get(val);
  if (!type) return;
  updater((store: CaptureStore) => {
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
    updater((store: CaptureStore) => {
      store.type = result[0];
      store.properties = resolvePropertiesForCapture(store.type.properties);
      return store;
    });
  });
}

/**
 * Saves the capture as node upon save click or tap event.
 * @param setter
 * @returns
 */
async function save(setter: any) {
  const val = get(captureStore);
  //TODO - extract nodes from markdown blocks and save
  const metadata = await resolveNodeCaptureMetadata();
  console.log("capture store", { val, metadata });
  let root: INodeItemCaptured = {
    id: prefixTable(generateUID(), Item.node),
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
    links:
      val.links?.map((link) => {
        return { id: link.id, linkType: link.linkType };
      }) ?? []
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
  let result = await new NodePersistance(currentUserId).createNode(nodeCapture);
  if (result) {
    setter({ ...generateSeedStore() });
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

function initCaptureStore() {
  const { subscribe, set, update } = writable<CaptureStore>(
    locallyPersistedCapture ?? { ...generateSeedStore() }
  );
  dataManager.retrieveCache(Item.capture).then((x) => {
    if (x) {
      set(x as CaptureStore);
    }
  });
  const persist = (val: CaptureStore) => {
    cache(val);
    dataManager.performMutation(
      Item.capture,
      { ...val },
      { action: PersistanceActionType.MERGE }
    );
  };
  const cache = (val: CaptureStore) => {
    dataManager.cache(val);
    persistLocally(Item.capture, val);
  };
  const debouncedPersist = debouncer(persist, 3000);
  return {
    subscribe,
    set: (val: CaptureStore) => {
      set(val);
      debouncedPersist(val);
    },
    update,
    reset: () => {
      const seedStore = generateSeedStore();
      set({ ...seedStore, refreshId: new Date().getTime() });
      persist({ ...seedStore, refreshId: new Date().getTime() });
      console.log("reset capture store", get(captureStore));
    },
    loader: (data: any) => {
      console.log("loading capture store", get(captureStore), { data });
      if (!data) return;
      const val = {
        ...data,
        id: Item.capture,
        refreshId: new Date().getTime()
      };
      set(val);
      cache(val);
    },
    onTypeSelect: (val: CaptureType | string) => onTypeSelect(update, val),
    save: () => save(set),
    searchForLinking: async (query: string) => {
      // return new NodePersistance().searchForLinking(searchQuery);
      const dexie = get(dataManager).cacheSource.dexie;
      // const nodesPromise = dexie.node
      //   .where("title")
      //   .anyOfIgnoreCase(query)
      //   .toArray()
      //   .then((nodes) => nodes.map((node) => ({ ...node, label: node.title })));
      const nodesPromise = dexie.node
        .filter(activeResourceFilter)
        .filter(
          (node) =>
            (node.label &&
              node.label.toLowerCase().includes(query.toLowerCase())) ||
            false
        )
        .toArray()
        .then((nodes) => nodes.map((node) => ({ ...node, label: node.label })));

      // const collectionsPromise = dexie.curation
      //   .where("label")
      //   .anyOfIgnoreCase(query)
      //   .and((collection) => collection.type === CurationType.COLLECTION)
      //   .toArray();
      const collectionsPromise = dexie.curation
        .where({ type: CurationType.COLLECTION })
        .filter(activeResourceFilter)
        .filter((collection) =>
          collection.label.toLowerCase().includes(query.toLowerCase())
        )
        .toArray();
      // return nodesPromise;
      return Promise.all([nodesPromise, collectionsPromise]).then(
        ([nodes, collections]) => nodes.concat(collections)
      );
    },
    directLink: (item: LinkThumbnail) => {
      update((val) => {
        val.links = val.links ?? [];
        val.links.push({ ...item, linkType: LinkType.DIRECT });
        return val;
      });
    },
    removeDLink: (id: string) => {
      update((val) => {
        val.links = val.links?.filter((link) => link.id !== id);
        return val;
      });
    },
    setFile: (fileDetails: FileDetails | null) => {
      update((val) => {
        if (fileDetails) val.fileDetails = fileDetails;
        else val.fileDetails = undefined;
        console.log({ fileDetails });
        return val;
      });
    }
  };
}
