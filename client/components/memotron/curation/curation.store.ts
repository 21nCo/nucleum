import { CurationPersistance } from "$lib/client/stores/curation.persistance";
import {
  CollectionLayout,
  CombinationViewType,
  CurationType,
  type IActiveCollection,
  type ICollectionView,
  type ICurationCreationForm,
  type ICurationStore
} from "$lib/client/types/memotron/curation.type";
import account from "$lib/client/stores/account.store";
import { dataManager } from "$lib/client/stores/data.store";
import {
  StoreDataType,
  type ICacheableStore,
  PersistanceActionType
} from "$lib/client/types/data.type";
import { Item } from "$lib/client/types/item.enum";
import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
import { prefixTable } from "$lib/client/utils/text.utils";
import { debouncer, generateUID } from "$lib/client/utils/utils";
import { get, writable, type Updater } from "svelte/store";
import { Persistance } from "$lib/client/stores/persistance";
import { NodeThumbnailVariant } from "$lib/client/types/memotron/node.type";

const currentUserId: string = get(account)?.userInfo?.id ?? "";

const seedCurationsStore: ICurationStore = {
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

/**
 * Creates a new curation - propagates the mutation to the server and updates the local cache.
 * @param curation
 * @returns The created curation
 */
async function createCuration(curation: ICurationCreationForm) {
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
    createdBy: currentUserId,
    modifiedBy: currentUserId,
    isStarred: curation.isStarred ?? false,
    isArchived: false
  };
  const dm = get(dataManager);
  dm.cacheSource.dexie.curation.add(data);
  return dataManager.performMutation(
    Item.curation,
    { curation: data },
    PersistanceActionType.CUSTOM_QUERY,
    "return fn::memotron::curation::create($curation, $mutatedAt);",
    true
  );
}

function initCurationStore() {
  const { subscribe, set, update } =
    writable<ICurationStore>(seedCurationsStore);
  return {
    subscribe,
    set,
    update,
    refresh: () => {
      return dataManager.refreshForIFR(Item.curation);
    },
    create: createCuration,
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

export type IActiveCollectionStore = ReturnType<
  typeof generateActiveCollectionStore
>;

/**
 * Curation stores map for holding the state of active i.e. currently open curations in the UI
 */
const activeCurationStores = new Map<string, IActiveCollectionStore>();

/**
 * Resolves the active curation store for the given id. If the store does not exist, it will be initialized.
 * @param id - The id of the curation
 * @param context - The context from which the store is being accessed. This is used for debugging purposes.
 * @returns The active curation store
 */
export function resolveActiveCollectionStore(id: string, context: string = "") {
  if (!activeCurationStores.has(id)) {
    activeCurationStores.set(id, generateActiveCollectionStore(id));
  }
  let val = activeCurationStores.get(id);
  return val!;
}

export function determineCurationType(id: string) {
  let type;
  if (id.startsWith(Item.nodelinks)) {
    type = CurationType.NODELINKS;
  } else if (id.startsWith(Item.collection)) {
    type = CurationType.COLLECTION;
  } else {
    type = CurationType.COMBINATION;
  }
  return type;
}

async function initializeCollection(
  id: string,
  setter: any,
  updater: any,
  viewId?: string
) {
  const dm = get(dataManager);
  let type = determineCurationType(id);
  const response = await new CurationPersistance().fetch(id, viewId);
  // console.log("curation fetch response", { response });
  if (type === CurationType.COLLECTION && response.curation) {
    updater((store: IActiveCollection) => {
      if (!isValidArrayWithData(response.curation.views)) return store;
      store = response.curation;
      if (viewId && store.views.some((x) => x.id === viewId))
        store.views.find((x) => x.id === viewId)!.data = response.data;
      else store.views[0].data = response.data;
      //TEMP - for testing
      if (!store.cover)
        // store.cover = "";
        store.cover =
          "https://s3.us-east-1.amazonaws.com/tidyfilesdevfive.us-east-1/428bavow4oj5a56mfuvw/image/21625c64-f959-4329-8c79-590f4c3a7af7_lily-banse--YHSwy6uqvk-unsplash.jpg";
      // console.log({ store });
      return store;
    });
  } else if (type === CurationType.NODELINKS && response.node) {
    if (response.directlinks) {
      updater((store: IActiveCollection) => {
        if (!("views" in store)) return store;
        store.views = [
          {
            id: "backlinks",
            data: response.directlinks,
            layout: CollectionLayout.BOARD,
            label: "Backlinks",
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            createdBy: currentUserId,
            modifiedBy: currentUserId,
            tabBy: "none",
            groupBy: "none",
            subGroupBy: "none",
            arrangement: NodeThumbnailVariant.LIST
          }
        ];
        return store;
      });
    }
  } else {
    if (type === CurationType.NODELINKS) {
      id = id.replace(Item.nodelinks + ":", "");
      const record = await dm.cacheSource.dexie.node.get(id);
      //TODO - handle the case of record not present locally
      setter({
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
        setter({
          ...record,
          type,
          isRefreshing: true,
          views: []
        });
      }
    }
  }
  updater((store: IActiveCollection) => {
    store.isRefreshing = false;
    return store;
  });
}

async function createView(
  updater: (this: void, updater: Updater<IActiveCollection>) => void,
  collectionId: string,
  viewToDuplicate?: string
) {
  let newView: ICollectionView;
  let viewToBeDuplicated: ICollectionView | undefined;
  let partial: Omit<
    ICollectionView,
    "id" | "createdAt" | "modifiedAt" | "createdBy" | "modifiedBy"
  >;
  if (viewToDuplicate) {
    updater((val: IActiveCollection) => {
      viewToBeDuplicated = val.views.find((v) => v.id === viewToDuplicate);
      return val;
    });
    partial = viewToBeDuplicated as ICollectionView;
  } else {
    partial = {
      label: "New view",
      layout: CollectionLayout.BOARD,
      tabBy: "none",
      groupBy: "none",
      subGroupBy: "none",
      arrangement: NodeThumbnailVariant.LIST
    };
  }
  newView = {
    ...partial,
    id: prefixTable(generateUID(), Item.view),
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    createdBy: currentUserId,
    modifiedBy: currentUserId
  };
  updater((val: IActiveCollection) => {
    val.views.push(newView);
    return val;
  });
  new CurationPersistance().createView(newView, collectionId);
  return newView.id;
}

async function deleteView(
  updater: (this: void, updater: Updater<IActiveCollection>) => void,
  id: string
) {
  updater((val: IActiveCollection) => {
    const viewToBeDeleted = val.views.find((v) => v.id == id);
    if (!viewToBeDeleted) return val;
    viewToBeDeleted.trashInformation = {
      deletedAt: new Date().toISOString(),
      deletedBy: currentUserId
    };
    return val;
  });
  await new Persistance().delete(id, Item.view, currentUserId);
}

const debouncedPersist = debouncer((view: ICollectionView) => {
  new Persistance().update(view);
}, 2000);

async function updateView(
  updater: (this: void, updater: Updater<IActiveCollection>) => void,
  view: ICollectionView
) {
  updater((val: IActiveCollection) => {
    let viewToBeUpdated = val.views.find((v) => v.id == view.id);
    if (!viewToBeUpdated) return val;
    viewToBeUpdated = { ...view };
    return val;
  });
  delete view.data;
  debouncedPersist(view);
}

async function refreshViewData(
  updater: (this: void, updater: Updater<IActiveCollection>) => void,
  viewId: string,
  collectionId: string
) {
  updater((val: IActiveCollection) => {
    val.isRefreshing = true;
    return val;
  });
  const response = await new CurationPersistance().fetchViewData(
    viewId,
    collectionId
  );
  if (!response || !isValidArrayWithData(response)) return;
  updater((val: IActiveCollection) => {
    val.views.find((v) => v.id === viewId)!.data = [...response];
    val.isRefreshing = false;
    return val;
  });
  return true;
}

/**
 * Initializes the active curation store. This store will hold the state of the active curation in the UI.
 * @returns The active curation store
 */
function generateActiveCollectionStore(collectionId: string) {
  const id = collectionId;
  const { subscribe, set, update } = writable<IActiveCollection>();
  return {
    subscribe,
    set,
    update,
    init: (id: string, viewId?: string) =>
      initializeCollection(id, set, update, viewId),
    createView: (viewToDuplicate?: string) =>
      createView(update, id, viewToDuplicate),
    deleteView: (id: string) => deleteView(update, id),
    updateView: (view: ICollectionView) => updateView(update, view),
    refreshViewData: (viewId: string) => refreshViewData(update, viewId, id)
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
