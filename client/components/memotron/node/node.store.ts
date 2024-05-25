import { NodePersistance } from "$lib/client/stores/node.persistance";
import account from "$lib/client/stores/account.store";
import { dataManager } from "$lib/client/stores/data.store";
import {
  PersistanceActionType,
  StoreDataType,
  type CacheableStore
} from "$lib/client/types/data.type";
import { Item } from "$lib/client/types/item.enum";
import type {
  ActiveNodeStore,
  NodeCapture
} from "$lib/client/types/memotron/node.type";
import { prefixTable } from "$lib/client/utils/text.utils";
import { generateUID } from "$lib/client/utils/utils";
import { get, writable } from "svelte/store";
const seedNodeStore: NodeStore = {
  id: Item.node,
  dataType: StoreDataType.IFR,
  priorityRefreshOnAppAppear: true,
  dependencies: [],
  mutatingResources: [Item.node]
};
/**
 * Experimental - Will be removed if the need for IFR store is not substantial.
 * Ideation: https://www.notion.so/blanklabs/Caching-IFR-searchable-resources-ideation-5859a07de2774c2690124a907bf8a3ac?pvs=4#9911afedc2824aedb8d1bed1312e735d
 *
 * Store for handling mutations on nodes.
 * Fetching will be directly done accessing dexie store's node resource.
 */
export const nodes = initNodeStore();

type NodeStore = CacheableStore;

function initNodeStore() {
  const { subscribe, set, update } = writable<NodeStore>(seedNodeStore);
  return {
    subscribe,
    set,
    update,
    create: async (node: Partial<NodeCapture>) => {
      const userId = get(account)?.userInfo?.id ?? "user:undetermined";
      const data: NodeCapture = {
        id: prefixTable(generateUID(), Item.node),
        ...node,
        createdBy: userId,
        modifiedBy: userId,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        isArchived: false
      };
      const dm = get(dataManager);
      dm.cacheSource.dexie.node.add(data);
      return dataManager.performMutation(
        Item.node,
        { node: data, links: data.links ?? [] },
        PersistanceActionType.CUSTOM_QUERY,
        "return fn::memotron::node::save($node, $links, $mutatedAt);",
        true
      );
      // return await new NodePersistance().save(data);
    },
    modify: () => {
      //delegated from active node individual stores
    }
  };
}

export type ActiveNodeStoreType = ReturnType<typeof initActiveNodeStore>;

/**
 * Node store map for individual nodes that are open in the UI.
 */
const activeNodeStores = new Map<string, ActiveNodeStoreType>();

/**
 * Resolves the active node store for the given id. If the store does not exist, it will be initialized.
 * @param id - The id of the node
 * @param context - The context from which the store is being accessed. This is used for debugging purposes.
 * @returns The active node store
 */
export function resolveActiveNodeStore(id: string, context: string = "") {
  if (!activeNodeStores.has(id)) {
    //console.log("init node store from: " + context + " id: " + id);
    activeNodeStores.set(id, initActiveNodeStore());
  }
  let val = activeNodeStores.get(id);
  return val!;
}

async function resolveAssociatedType(typeId: string) {
  if (!typeId) return null;
  const tb = get(dataManager).cacheSource.dexie.type;
  return tb.get(typeId);
}

/**
 * Initializes the active node store. This store will hold the state of the active node in the UI.
 * @returns The active node store
 */
function initActiveNodeStore() {
  const { subscribe, set, update } = writable<ActiveNodeStore>();
  return {
    subscribe,
    set,
    //TODO - mutations to title, properties, etc (nodular markdown changes will be handled by the markdown store granularly) - considerations: History, snapshotting etc
    update,
    fetch: async (id: string) => {
      const result = await new NodePersistance().fetch(id);
      if (result) {
        set(result);
      }
    }
  };
}
