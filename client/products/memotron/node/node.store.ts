import { NodePersistence } from "$lib/client/products/memotron/node/node.persistence";
import account from "$lib/client/stores/account.store";
import { dataManager } from "$lib/client/persistence/dataManager";
import {
  PersistanceActionType,
  StoreDataType,
  type ICacheableStore
} from "$lib/client/types/data.type";
import { Item } from "$lib/client/types/item.enum";
import type {
  IActiveNode,
  INode,
  INodeCapture,
  INodeProperty,
  INodeStore,
  NodeType
} from "$lib/client/types/memotron/node.type";
import { prefixTable } from "$lib/client/utils/text.utils";
import { debouncer, generateUID } from "$lib/client/utils/utils";
import { get, writable, type Updater } from "svelte/store";
import { ActiveResourceStore } from "$lib/client/stores/resource.store";

export const hierarchyFactorLimit = 5;
const currentUserId: string = get(account)?.userInfo?.id ?? "";

const seedNodeStore: INodeStore = {
  id: Item.node,
  dataType: StoreDataType.IFR,
  priorityRefreshOnAppAppear: true,
  dependencies: [],
  mutatingResources: [Item.node]
};
/**
 *
 * @deprecated - Use ResourcePersistance instead
 * Store for handling mutations on nodes.
 * Fetching will be directly done accessing dexie store's node resource.
 */
export const nodes = initNodeStore();

async function createNode(node: Partial<INodeCapture>) {
  const data: INodeCapture = {
    id: prefixTable(generateUID(), Item.node),
    ...node,
    createdBy: currentUserId,
    modifiedBy: currentUserId,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    isArchived: false
  };
  return dataManager.performMutationForIFR(
    Item.node,
    { node: data, links: data.links ?? [] },
    {
      action: PersistanceActionType.CUSTOM_CREATE,
      query: "return fn::memotron::node::save($node, $links, $mutatedAt);"
    }
  );
}

async function modifyNode(id: string, node: Partial<INode>) {
  const data: Partial<INode> = {
    id,
    ...node,
    modifiedBy: currentUserId
  };
  return dataManager.performMutationForIFR(Item.node, data, {
    action: PersistanceActionType.MERGE
  });
}

async function deleteNode(id: string) {
  return dataManager.performMutationForIFR(
    Item.node,
    { id, modifiedBy: currentUserId },
    { action: PersistanceActionType.DELETE }
  );
}

function initNodeStore() {
  const { subscribe, set, update } = writable<INodeStore>(seedNodeStore);
  return {
    subscribe,
    set,
    update,
    create: (node: Partial<INodeCapture>) => createNode(node),
    modify: (id: string, node: Partial<INode>) => modifyNode(id, node),
    //TODO - bulk modify
    bulkModify: (nodes: string[], changes: Partial<INode>) => {},
    delete: (id: string) => deleteNode(id)
  };
}

// export type IActiveNodeStore = ReturnType<typeof initActiveNodeStore>;
export type IActiveNodeStore = InstanceType<typeof ActiveNodeStore>;

/**
 * Node store map for individual nodes that are open in the UI.
 */
const activeNodeStores = new Map<string, IActiveNodeStore>();
const nodePersistance = new NodePersistence(currentUserId);
/**
 * Resolves the active node store for the given id. If the store does not exist, it will be initialized.
 * @param id - The id of the node
 * @param context - The context from which the store is being accessed. This is used for debugging purposes.
 * @returns The active node store
 */
export function resolveActiveNodeStore(id: string, context: string = "") {
  if (!activeNodeStores.has(id)) {
    //console.log("init node store from: " + context + " id: " + id);
    // activeNodeStores.set(id, initActiveNodeStore(id));
    activeNodeStores.set(id, new ActiveNodeStore(id));
  }
  let val = activeNodeStores.get(id);
  return val!;
}

export async function resolveAssociatedType(typeId: string) {
  if (!typeId) return null;
  const tb = get(dataManager).cacheSource.dexie.type;
  return tb.get(typeId);
}

async function fetchNode(
  id: string,
  setter: (this: void, value: IActiveNode) => void
) {
  const result = await nodePersistance.fetch(id);
  if (result) {
    setter(result);
  }
}

async function updateProperties(
  id: string,
  updater: (this: void, updater: Updater<IActiveNode>) => void,
  properties: INodeProperty[]
) {
  updater((prev) => ({ ...prev, properties }));
  return nodePersistance.modify(id, { properties });
}

/**
 * @deprecated - Use ActiveNodeStore class instead
 * Initializes the active node store. This store will hold the state of the active node in the UI.
 * @returns The active node store
 */
function initActiveNodeStore(node: string) {
  const id = node;
  const { subscribe, set, update } = writable<IActiveNode>();
  const updatePropagator = (val: Partial<INode>) =>
    nodePersistance.modify(id, val);
  const debouncedPersist = debouncer(updatePropagator, 2000);
  return {
    subscribe,
    set,
    //TODO - mutations to title, properties, etc (nodular markdown changes will be handled by the markdown store granularly) - considerations: History, snapshotting etc
    update,
    fetch: () => fetchNode(id, set),
    updateProperties: async (properties: INodeProperty[]) =>
      updateProperties(id, update, properties),
    propagateTitleChange: async (label: string) => {
      return debouncedPersist({ label });
    },
    delete: async () => {
      update((prev) => ({
        ...prev,
        trashInformation: {
          deletedBy: currentUserId,
          deletedAt: new Date().toISOString()
        }
      }));
      return nodePersistance.delete(id);
    },
    archive: async () => {
      update((prev) => ({
        ...prev,
        isArchived: true,
        modifiedBy: currentUserId,
        modifiedAt: new Date().toISOString()
      }));
      return nodePersistance.modify(id, { isArchived: true });
    },
    unarchive: async () => {
      update((prev) => ({
        ...prev,
        isArchived: false,
        modifiedBy: currentUserId,
        modifiedAt: new Date().toISOString()
      }));
      return nodePersistance.modify(id, { isArchived: false });
    },
    restore: async () => {
      update((prev) => ({ ...prev, trashInformation: undefined }));
      return nodePersistance.modify(id, { trashInformation: undefined });
    }
  };
}

class ActiveNodeStore extends ActiveResourceStore<IActiveNode> {
  constructor(node: string) {
    super(node, nodePersistance, currentUserId);
  }
  debouncers = new Map<string, any>();
  updateBlockPropagator = (
    id: string,
    mutationId: string,
    changedProps: { body?: string; children?: string[] }
  ) =>
    nodePersistance.modify(id, changedProps, {
      mutationId,
      isUseQueueFirstApproach: true
    });
  resolveDebouncerForBlockPersistance(id: string) {
    if (!this.debouncers.has(id)) {
      this.debouncers.set(id, debouncer(this.updateBlockPropagator, 2000));
    }
    let val = this.debouncers.get(id);
    return val!;
  }
  fetch = () => fetchNode(this.id, this.set);
  updateProperties = async (properties: INodeProperty[]) =>
    updateProperties(this.id, this.update, properties);
  updateBlock = (id: string, changedProps: any) => {
    const mutationId =
      `${id}-` +
      ("children" in changedProps
        ? "children"
        : "body" in changedProps
          ? "body"
          : "block");
    const debouncer = this.resolveDebouncerForBlockPersistance(mutationId);
    debouncer(id, mutationId, changedProps);
  };
  createBlock = async (id: string, contentType: any) => {
    return nodePersistance.createNode(
      {
        resources: [
          {
            id,
            body: "",
            contentType,
            creationContext: this.id
          }
        ]
      },
      {
        isUseQueueFirstApproach: true,
        mutationId: `${id}-create`
      }
    );
  };
  deleteBlock = async (id: string) => {
    return nodePersistance.delete(id, {
      isUseQueueFirstApproach: true,
      mutationId: `${id}-delete`
    });
  };
}
