import { CurationPersistance } from "$lib/client/stores/curation.persistance";
import {
  CollectionLayout,
  CombinationViewType,
  CurationType,
  type ActiveCurationStore,
  type ICurationCreationForm
} from "$lib/client/types/memotron/curation.type";
import account from "$lib/client/stores/account.store";
import { dataManager } from "$lib/client/stores/data.store";
import {
  StoreDataType,
  type CacheableStore,
  PersistanceActionType
} from "$lib/client/types/data.type";
import { Item } from "$lib/client/types/item.enum";
import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
import { prefixTable } from "$lib/client/utils/text.utils";
import { generateUID } from "$lib/client/utils/utils";
import { get, writable } from "svelte/store";
import { resolveAssociatedType } from "../node/node.store";
import type { IType } from "$lib/client/types/memotron/type.type";

const seedCurationsStore: CurationStore = {
  id: Item.curation,
  refreshQuery: "return fn::memotron::curation::fetchAll($since);",
  dataType: StoreDataType.IFR,
  priorityRefreshOnAppAppear: true,
  dependencies: [],
  mutatingResources: [Item.curation]
};
/**
 *
 * Experimental - Will be removed if the need for IFR store is not substantial.
 * Ideation: https://www.notion.so/blanklabs/Caching-IFR-searchable-resources-ideation-5859a07de2774c2690124a907bf8a3ac?pvs=4#9911afedc2824aedb8d1bed1312e735d
 *
 * Store for handling mutations.
 * Fetching will be directly done accessing dexie store.
 */
export const curations = initCurationStore();

type CurationStore = CacheableStore;

function initCurationStore() {
  const { subscribe, set, update } =
    writable<CurationStore>(seedCurationsStore);
  return {
    subscribe,
    set,
    update,
    refresh: () => {
      return dataManager.refreshForIFR(Item.curation);
    },
    create: async (curation: ICurationCreationForm) => {
      const data = {
        id: prefixTable(
          generateUID(),
          curation.type === CurationType.COLLECTION
            ? Item.collection
            : Item.combination
        ),
        ...curation,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        createdBy: get(account)?.userInfo?.id ?? "",
        modifiedBy: get(account)?.userInfo?.id ?? "",
        isStarred: curation.isStarred ?? false,
        isArchived: false
      };
      const dm = get(dataManager);
      dm.cacheSource.dexie.curation.add(data);
      //TODO - add view to view table on dexie
      return dataManager.performMutation(
        Item.curation,
        { curation: data },
        PersistanceActionType.CUSTOM_QUERY,
        "return fn::memotron::curation::create($curation, $mutatedAt);",
        true
      );
    },
    modify: () => {
      //delegated from active curation individual stores
    },
    delete: (id: string) => {
      return dataManager.performMutationForIFR(
        Item.curation,
        PersistanceActionType.DELETE,
        { id }
      );
    }
  };
}

export type ActiveCurationStoreType = ReturnType<
  typeof initActiveCurationStore
>;

/**
 * Curation stores map for holding the state of active i.e. currently open curations in the UI
 */
const activeCurationStores = new Map<string, ActiveCurationStoreType>();

/**
 * Resolves the active curation store for the given id. If the store does not exist, it will be initialized.
 * @param id - The id of the curation
 * @param context - The context from which the store is being accessed. This is used for debugging purposes.
 * @returns The active curation store
 */
export function resolveActiveCurationStore(id: string, context: string = "") {
  if (!activeCurationStores.has(id)) {
    activeCurationStores.set(id, initActiveCurationStore());
  }
  let val = activeCurationStores.get(id);
  return val!;
}

/**
 * Initializes the active curation store. This store will hold the state of the active curation in the UI.
 * @returns The active curation store
 */
function initActiveCurationStore() {
  const { subscribe, set, update } = writable<ActiveCurationStore>();
  return {
    subscribe,
    set,
    update,
    init: async (id: string) => {
      const dm = get(dataManager);
      let type;
      if (id.startsWith(Item.nodelinks)) {
        type = CurationType.NODELINKS;
      } else if (id.startsWith(Item.collection)) {
        type = CurationType.COLLECTION;
      } else {
        type = CurationType.COMBINATION;
      }
      if (type === CurationType.NODELINKS) {
        id = id.replace(Item.nodelinks + ":", "");
        const record = await dm.cacheSource.dexie.node.get(id);
        //TODO - handle the case of record not present locally
        set({
          id,
          type,
          label: record?.label ?? "Links",
          createdAt: record?.createdAt ?? new Date().toISOString(),
          modifiedAt: record?.modifiedAt ?? new Date().toISOString(),
          views: [],
          isRefreshing: true
        });
      } else {
        const record = await dm.cacheSource.dexie.curation.get(id);
        if (record) {
          set({
            ...record,
            type,
            isRefreshing: true,
            views: []
          });
        }
      }
      //TODO - fetch full curation from db
      const response = await new CurationPersistance().fetch(id);
      console.log({ response });
      let associatedType: IType | null = null;
      //TEMP - reading from local - send full type from db itself...
      if (response.curation?.associatedType) {
        associatedType =
          (await resolveAssociatedType(response.curation.associatedType)) ??
          null;
      }
      if (
        type === CurationType.COLLECTION &&
        response.curation &&
        response?.entries
      ) {
        update((store) => {
          if (
            !("views" in store) ||
            !isValidArrayWithData(response.curation.views)
          )
            return store;
          store.views = [
            { ...response.curation.views?.[0], data: response.entries }
          ];
          if (associatedType) store.associatedType = associatedType;
          //TEMP - for testing
          if (!store.cover) store.cover = "";
          // store.cover =
          //   "https://s3.us-east-1.amazonaws.com/tidyfilesdevfive.us-east-1/428bavow4oj5a56mfuvw/image/21625c64-f959-4329-8c79-590f4c3a7af7_lily-banse--YHSwy6uqvk-unsplash.jpg";
          console.log({ store });
          return store;
        });
      } else if (type === CurationType.NODELINKS && response.node) {
        if (response.directlinks) {
          update((store) => {
            if (!("views" in store)) return store;
            store.views = [
              {
                id: "backlinks",
                data: response.directlinks
              }
            ];
            return store;
          });
        }
      }
      update((store) => {
        store.isRefreshing = false;
        return store;
      });
    }
  };
}

export const collectionLayoutOptions = [
  {
    value: CollectionLayout.BOARD,
    icon: "rectangle-stack"
  },
  {
    value: CollectionLayout.TABLE,
    icon: "table-cells"
  },
  { value: CollectionLayout.HEATMAP, icon: "calendar-days" },
  { value: CollectionLayout.GEOMAP, icon: "map" }
];

export const combinationLayoutOptions = [
  { value: CombinationViewType.TREE, icon: "rectangle-stack" },
  { value: CombinationViewType.GRAPH, icon: "graph" },
  { value: CombinationViewType.WHITEBOARD, icon: "whiteboard" },
  { value: CombinationViewType.INFIGRID, icon: "infigrid" }
];
