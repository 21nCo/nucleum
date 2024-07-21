import { dataManager } from "$lib/client/persistence/dataManager";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { prefixTable } from "$lib/shared/utils/text.utils";
import {
  activeResourceFilter,
  debouncer,
  generateUID,
  interceptSurrealResponse
} from "$lib/client/utils/utils";
import { get } from "svelte/store";
import { NodeThumbnailVariant } from "$lib/client/products/memotron/node/node.type";
import {
  ActiveResourceStore,
  ResourceStore
} from "$lib/client/components/resourceStores/resource.store";
import { Persistence } from "$lib/client/persistence/persistence";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import type { ISurrealDatabase } from "$lib/client/types/db.type";
import {
  CollectionLayout,
  type IActiveCollection,
  type ICollectionView,
  CollectionType,
  type ICollection
} from "$lib/client/products/memotron/collection/collection.type";
import {
  propertyEditorStore,
  propertyStore
} from "./properties/property.store";
import { Arrangement } from "$lib/client/types/direction.enum";
import { CombinationViewType } from "../curation/curation.type";

class CollectionStore extends ResourceStore<ICollection> {
  db: ISurrealDatabase;
  constructor() {
    super(Resource.collection, {
      priorityRefreshOnAppAppear: true
    });
    this.db = new SurrealDatabase();
  }
  async create(
    form: Partial<ICollection> & { defaultLayout: CollectionLayout }
  ) {
    const id = prefixTable(generateUID(), Resource.collection);
    const properties = propertyEditorStore.get();
    const resource: Partial<ICollection> = {
      ...form,
      id,
      views: [],
      properties: []
    };
    if (form.type === CollectionType.TYPED && properties?.length > 0) {
      await propertyStore.create(properties, {
        queueParams: {
          isUseQueueFirstApproach: true,
          mutationId: `${id}-createProperties`
        }
      });
      resource.properties = properties.map((p) => p.id);
    }
    const viewId = prefixTable(generateUID(), Resource.view);
    await viewStore.create(
      {
        id: viewId,
        layout: form.defaultLayout,
        label: "Default"
      },
      {
        queueParams: {
          isUseQueueFirstApproach: true,
          mutationId: `${id}-${viewId}-create`
        }
      }
    );
    resource.views = [viewId];
    return super.create(resource, {
      queueParams: {
        isUseQueueFirstApproach: true,
        mutationId: `${id}-create`
      }
    });
  }

  async fetch(id: string, viewId?: string) {
    const query = `fn::memotron::collection::fetch($id, $viewId)`;
    const response = await this.db.executeReadFn(
      query,
      viewId ? { id, viewId } : { id }
    );
    return interceptSurrealResponse(response, "fetch curation");
  }

  async createView(view: ICollectionView, collectionId: string) {
    const query = `fn::memotron::collection::createView($view, $collectionId)`;
    const response = await this.db.query(query, {
      view,
      collectionId
    });
    return interceptSurrealResponse(response, "create view");
  }
  async fetchViewData(viewId: string, collectionId: string) {
    const query = `fn::memotron::collection::fetchData($viewId, $collectionId)`;
    const response = await this.db.query(query, {
      viewId,
      collectionId
    });
    return interceptSurrealResponse(response, "fetch view data");
  }
  search(query: string) {
    if (!query) return [] as any;
    const dexie = get(dataManager).cacheSource.dexie;
    const collectionsPromise = dexie.collection
      .filter(activeResourceFilter)
      .filter((collection) =>
        collection.label?.toLowerCase()?.includes(query.toLowerCase())
      )
      .toArray();
    return collectionsPromise;
  }
}

export const collectionStore = new CollectionStore();

export type IActiveCollectionStore = InstanceType<typeof ActiveCollectionStore>;

/**
 * Curation stores map for holding the state of active i.e. currently open curations in the UI
 */
const activeCollectionStoreMap = new Map<string, IActiveCollectionStore>();

/**
 * Resolves the active curation store for the given id. If the store does not exist, it will be initialized.
 * @param id - The id of the curation
 * @param context - The context from which the store is being accessed. This is used for debugging purposes.
 * @returns The active curation store
 */
export function resolveActiveCollectionStore(id: string, context: string = "") {
  if (!activeCollectionStoreMap.has(id)) {
    activeCollectionStoreMap.set(id, new ActiveCollectionStore(id));
  }
  let val = activeCollectionStoreMap.get(id);
  return val!;
}

// export function determineCurationType(id: string) {
//   let type;
//   if (id.startsWith(Resource.nodelinks)) {
//     type = CurationType.NODELINKS;
//   } else if (id.startsWith(Resource.collection)) {
//     type = CurationType.COLLECTION;
//   } else {
//     type = CurationType.COMBINATION;
//   }
//   return type;
// }

class ActiveCollectionStore extends ActiveResourceStore<
  IActiveCollection,
  CollectionStore
> {
  debouncedPersistView = debouncer((view: ICollectionView) => {
    new Persistence().update(view);
  }, 2000);

  constructor(collectionId: string) {
    super(collectionId, collectionStore);
  }

  async init(viewId?: string) {
    const dm = get(dataManager);
    // let type = determineCurationType(this.id);
    const response = await this.resourceStore.fetch(this.id, viewId);
    // console.log("curation fetch response", { response });
    if (type === CurationType.COLLECTION && response.curation) {
      this.update((store: IActiveCollection) => {
        if (!isValidArrayWithData(response.curation.views)) return store;
        store = response.curation;
        if (viewId && store.views.some((x) => x.id === viewId))
          store.views.find((x) => x.id === viewId)!.data = response.data;
        else store.views[0].data = response.data;
        return store;
      });
    } else if (type === CurationType.NODELINKS && response.node) {
      if (response.directlinks) {
        this.update((store: IActiveCollection) => {
          if (!("views" in store)) return store;
          store.views = [
            {
              id: "backlinks",
              data: response.directlinks,
              layout: CollectionLayout.BOARD,
              label: "Backlinks",
              createdAt: new Date().toISOString(),
              modifiedAt: new Date().toISOString(),
              createdBy: this.currentUserId,
              modifiedBy: this.currentUserId,
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
        // id = this.id.replace(Item.nodelinks + ":", "");
        // const record = await dm.cacheSource.dexie.node.get(this.id);
        // //TODO - handle the case of record not present locally
        // this.set({
        //   id: this.id,
        //   type,
        //   label: record?.label ?? "Links",
        //   createdAt: record?.createdAt ?? new Date().toISOString(),
        //   modifiedAt: record?.modifiedAt ?? new Date().toISOString(),
        //   views: [],
        //   isRefreshing: true
        // });
      } else {
        const record = await dm.cacheSource.dexie.collection.get(this.id);
        if (record) {
          this.set({
            ...record,
            type,
            isRefreshing: true,
            views: []
          });
        }
      }
    }
    this.update((store: IActiveCollection) => {
      store.isRefreshing = false;
      return store;
    });
  }

  createView(viewToDuplicate?: string) {
    let newView: ICollectionView;
    let viewToBeDuplicated: ICollectionView | undefined;
    let partial: Omit<
      ICollectionView,
      "id" | "createdAt" | "modifiedAt" | "createdBy" | "modifiedBy"
    >;
    if (viewToDuplicate) {
      this.update((val: IActiveCollection) => {
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
        arrangement: Arrangement.LIST
      };
    }
    newView = {
      ...partial,
      id: prefixTable(generateUID(), Resource.view),
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      createdBy: this.currentUserId,
      modifiedBy: this.currentUserId
    };
    this.update((val: IActiveCollection) => {
      val.views.push(newView);
      return val;
    });
    this.resourceStore.createView(newView, this.id);
    return newView.id;
  }

  async deleteView(id: string) {
    this.update((val: IActiveCollection) => {
      const viewToBeDeleted = val.views.find((v) => v.id == id);
      if (!viewToBeDeleted) return val;
      viewToBeDeleted.trashInformation = {
        deletedAt: new Date().toISOString(),
        deletedBy: this.currentUserId
      };
      return val;
    });
    return new Persistence().delete(id, Resource.view, this.currentUserId);
  }

  updateView(view: ICollectionView) {
    this.update((val: IActiveCollection) => {
      let viewToBeUpdated = val.views.find((v) => v.id == view.id);
      if (!viewToBeUpdated) return val;
      viewToBeUpdated = { ...view };
      return val;
    });
    delete view.data;
    this.debouncedPersistView(view);
  }

  async refreshViewData(viewId: string) {
    this.update((val: IActiveCollection) => {
      val.isRefreshing = true;
      return val;
    });
    const response = await this.resourceStore.fetchViewData(viewId, this.id);
    if (!response || !isValidArrayWithData(response)) return;
    this.update((val: IActiveCollection) => {
      val.views.find((v) => v.id === viewId)!.data = [...response];
      val.isRefreshing = false;
      return val;
    });
    return true;
  }
}

class CollectionViewStore extends ResourceStore<ICollectionView> {
  db: ISurrealDatabase;
  constructor() {
    super(Resource.view, {
      priorityRefreshOnAppAppear: true
    });
    this.db = new SurrealDatabase();
  }
}

export const viewStore = new CollectionViewStore();

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
