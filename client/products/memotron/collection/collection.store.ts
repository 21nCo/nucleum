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
import {
  activeResources,
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
import { ResourceAccessPoint } from "$lib/client/components/resourceStores/resource.type";
import { ResourceActions } from "../common/resource.actions";
import { logger } from "$lib/client/stores/log.store";

class CollectionStore extends ResourceStore<ICollection> {
  db: ISurrealDatabase;
  constructor() {
    super(Resource.collection, {
      refreshOnAppear: true
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
  if (!activeResources.has(id)) {
    activeResources.set(id, new ActiveCollectionStore(id));
  }
  let val = activeResources.get(id);
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
  debouncedPersistView = debouncer((id: string, view: ICollectionView) => {
    console.log("debouncedPersistView", { id, view });
    viewStore.modify(id, view);
  }, 2000);

  constructor(collectionId: string) {
    super(collectionId, collectionStore);
  }

  /**
   * Initialized the collection with local cached data
   */
  async init() {
    try {
      this.resourceStore.modify(this.id, {
        interactedAt: new Date().toISOString()
      });
      this.update((val: IActiveCollection) => {
        if (val) val.isPageLoading = true;
        else val = { isPageLoading: true };
        return val;
      });
      const dm = get(dataManager);
      const record = await dm.cacheSource.dexie.collection.get(this.id);
      const views = record?.views ?? [];
      let viewsWithData: ICollectionView[] = [];
      if (views.length > 0) {
        viewsWithData = await dm.cacheSource.dexie.view
          .where("id")
          .anyOfIgnoreCase(views.filter((x) => x))
          .toArray();
      }
      if (!record) return;
      this.set({
        ...record,
        isViewDataRefreshing: false,
        isViewDataLoading: true,
        isPageLoading: false,
        views: viewsWithData.map((x) => {
          return { ...x, data: [] };
        })
      });
    } catch (e) {
      console.error("error in init collection store", {
        id: this.id,
        error: e
      });
    }
  }

  async createView(viewToDuplicate?: string) {
    let viewToBeDuplicated: ICollectionView | undefined;
    let partial: Omit<
      ICollectionView,
      | "id"
      | "createdAt"
      | "modifiedAt"
      | "createdBy"
      | "modifiedBy"
      | "interactedAt"
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
    const createdViewResult = await viewStore.create(partial, {
      queueParams: {
        isUseQueueFirstApproach: true,
        mutationId: `${this.id}-createView-${Date.now()}`
      }
    });
    const createdViewId = createdViewResult[0] as string;
    const dm = get(dataManager);
    const createdView = await dm.cacheSource.dexie.view.get(createdViewId);
    if (!createdView) return;
    console.log("createdView", { createdView });

    this.update((val: IActiveCollection) => {
      val.views.push({ ...createdView, data: [] });
      return val;
    });

    this.resourceStore.modify(
      this.id,
      {
        views: [...(this.get().views.map((x) => x.id) ?? []), createdView.id]
      },
      {
        isUseQueueFirstApproach: true,
        mutationId: `${this.id}-addView-${Date.now()}`
      }
    );
    return createdView.id;
  }

  async deleteView(id: string) {
    this.update((val: IActiveCollection) => {
      const viewToBeDeleted = val.views.find((v) => v.id == id);
      if (!viewToBeDeleted) return val;
      viewToBeDeleted.trashInformation = {
        deletedAt: new Date().toISOString(),
        deletedBy: this.currentUserId ?? ""
      };
      return val;
    });
    return viewStore.delete(id);
  }

  updateView(id: string, view: Partial<ICollectionView>) {
    this.update((val: IActiveCollection) => {
      val.views = val.views.map((v) => {
        if (v.id == id) return { ...v, ...view };
        return v;
      });
      return val;
    });
    this.debouncedPersistView(id, view);
  }

  /**
   * Fetches the view data from the server and updates the store with the new data. Sets the isViewDataLoading flag to true unlike {@link refreshViewData} which sets isViewDataRefreshing to true and refreshError if any error occurs.
   * @param viewId
   * @returns
   */
  async loadViewData(viewId: string) {
    console.log({ context: "loadViewData", viewId });
    this.update((val: IActiveCollection) => {
      val.isViewDataLoading = true;
      return val;
    });
    const response = await viewStore.fetchViewData(viewId, this.id);
    if (!response || !isValidArrayWithData(response)) {
      this.update((val: IActiveCollection) => {
        val.isViewDataLoading = false;
        return val;
      });
      return;
    }
    this.update((val: IActiveCollection) => {
      val.views.find((v) => v.id === viewId)!.data = [...response];
      val.isViewDataLoading = false;
      return val;
    });
    return true;
  }

  /**
   * Fetches the view data from the server and updates the store with the new data.
   * @param viewId
   * @returns
   */
  async refreshViewData(viewId: string) {
    console.log({ context: "refreshViewData", viewId });
    this.update((val: IActiveCollection) => {
      val.isViewDataRefreshing = true;
      return val;
    });
    const response = await viewStore.fetchViewData(viewId, this.id);
    if (!response || !isValidArrayWithData(response)) {
      this.update((val: IActiveCollection) => {
        val.refreshError = "Error refreshing data.";
        val.isViewDataRefreshing = false;
        return val;
      });
      return;
    }
    this.update((val: IActiveCollection) => {
      val.views.find((v) => v.id === viewId)!.data = [...response];
      val.isViewDataRefreshing = false;
      return val;
    });
    return true;
  }
}

class CollectionViewStore extends ResourceStore<ICollectionView> {
  db: ISurrealDatabase;
  constructor() {
    super(Resource.view, {
      refreshOnAppear: true,
      dboDependencies: ["fn::memotron::collection::fetchData"]
    });
    this.db = new SurrealDatabase();
  }
  async fetchViewData(viewId: string, collectionId: string) {
    const query = `fn::memotron::collection::fetchData($viewId, $collectionId)`;
    const response = await this.db.executeReadFn(query, {
      viewId,
      collectionId
    });
    return interceptSurrealResponse(response, "fetch view data");
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
  { value: CollectionLayout.CALENDAR, icon: "calendar-days" },
  { value: CollectionLayout.GEOMAP, icon: "map" }
];

export const combinationLayoutOptions = [
  { value: CombinationViewType.TREE, icon: "rectangle-stack" },
  { value: CombinationViewType.GRAPH, icon: "graph" },
  { value: CombinationViewType.WHITEBOARD, icon: "whiteboard" },
  { value: CombinationViewType.INFIGRID, icon: "infigrid" }
];

export function resolveCollectionContextMenu(
  collection: ICollection,
  context: ResourceAccessPoint
) {
  const resourceActions = new ResourceActions(collection, collectionStore);
  if (context != ResourceAccessPoint.SELF) {
    return [
      {
        group: "all",
        items: [
          resourceActions.star(),
          resourceActions.edit(context),
          resourceActions.pinToTopBar(),
          resourceActions.select(),
          resourceActions.copyLink()
        ]
      },
      {
        group: "more",
        items: [resourceActions.archive(), resourceActions.trash()]
      }
    ];
  }
  return [
    {
      group: "all",
      items: [
        resourceActions.star(),
        resourceActions.edit(context),
        resourceActions.copyLink()
      ]
    },
    {
      group: "more",
      items: [resourceActions.archive(), resourceActions.trash()]
    }
  ];
}
