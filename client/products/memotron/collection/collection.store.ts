import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { debouncer } from "$lib/client/utils/utils";
import {
  activeResources,
  ActiveResourceStore,
  ResourceStore
} from "$lib/client/components/resourceStores/resource.store";
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
import { logger } from "$lib/client/components/debug/logger.client";
import { flux } from "$lib/client/persistence/dataManagerv2";
import { generateRandomId } from "$lib/shared/utils/crypto.utils";
import type { IProperty } from "./properties/property.type";
import type { IAvatar } from "$lib/client/types/avatar.type";
import type { IRecordId } from "$lib/client/types/data.type";
import { generateResourceId } from "$lib/shared/utils/text.utils";

class CollectionStore extends ResourceStore<ICollection> {
  constructor() {
    super(Resource.collection, {
      refreshOnAppear: true
    });
  }
  async create(
    form: Partial<ICollection> & { defaultLayout: CollectionLayout }
  ) {
    const id = generateResourceId(Resource.collection);
    const properties = propertyEditorStore.get();
    const resource: Partial<ICollection> = {
      ...form,
      id,
      views: [],
      properties: []
    };
    if (form.type === CollectionType.TYPED && properties?.length > 0) {
      await propertyStore.create(properties);
      resource.properties = properties.map((p) => p.id);
    }
    const viewId = generateResourceId(Resource.view);
    await viewStore.create({
      id: viewId,
      layout: form.defaultLayout,
      label: "Default"
    });
    resource.views = [viewId];
    return super.create(resource);
  }

  /**
   * TODO - testing extended properties
   * @param types
   * @returns
   */
  async resolveTypes(collections: string[]) {
    let types: string[] = [];
    let propertyConfig: IProperty[] = [];
    let avatars: IAvatar[] = [];
    if (!collections) return { types, propertyConfig, avatars };
    const query = `return select properties.* as properties, typeToExtend.properties.* as extendProperties from collection where id in $types;`;
    const result = await flux.selectByQuery(query, { types });
    return { types, propertyConfig, avatars };
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
export function resolveActiveCollectionStore(
  id: IRecordId,
  context: string = ""
) {
  const idStr = id.toString();
  if (!activeResources.has(idStr)) {
    activeResources.set(idStr, new ActiveCollectionStore(id));
  }
  let val = activeResources.get(idStr);
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

  constructor(collectionId: IRecordId) {
    super(collectionId, collectionStore);
  }

  /**
   * Initialized the collection with local cached data
   */
  async init() {
    logger.debug({ at: "ActiveCollectionStore.init", id: this.id });
    try {
      this.resourceStore.modify(this.id, {
        interactedAt: new Date().toISOString()
      });
      this.update((val: IActiveCollection) => {
        if (val) val.isPageLoading = true;
        else val = { isPageLoading: true };
        return val;
      });
      const result = await flux.select(this.id, [
        "*",
        "(select * from $parent.views) as views",
        "(select * from $parent.properties) as properties"
      ]);
      logger.debug({ at: "ActiveCollectionStore.init - select", result });
      let record = result;
      if (!record) return;
      this.set({
        ...record,
        isViewDataRefreshing: false,
        isViewDataLoading: true,
        isPageLoading: false,
        views: record.views.map((x) => {
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
    const createdView = await viewStore.create(partial);
    logger.debug({ at: "ActiveCollectionStore.createView", createdView });
    if (!createdView || !createdView.id) return;

    this.update((val: IActiveCollection) => {
      val.views.push({ ...createdView, data: [] });
      return val;
    });

    this.resourceStore.modify(this.id, {
      views: [...(this.get().views.map((x) => x.id) ?? []), createdView.id]
    });
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
    return viewStore.trash(id);
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
    logger.debug({ at: "ActiveCollectionStore.loadViewData", viewId });
    if (!viewId) return;
    this.update((val: IActiveCollection) => {
      val.isViewDataLoading = true;
      return val;
    });
    const response = await viewStore.fetchViewData(viewId, this.get().id);
    logger.debug({
      at: "ActiveCollectionStore.loadViewData - response",
      response
    });
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
    const response = await viewStore.fetchViewData(viewId, this.get().id);
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
  constructor() {
    super(Resource.view, {
      refreshOnAppear: true,
      dboDependencies: ["fn::memotron::collection::fetchData"]
    });
  }
  fetchViewData(viewId: IRecordId, collectionId: IRecordId) {
    const query = `fn::memotron::collection::fetchData($viewId, $collectionId)`;
    return flux.selectByQuery(query, {
      viewId,
      collectionId
    });
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
  accessPoint: ResourceAccessPoint
) {
  const resourceActions = new ResourceActions(collection, collectionStore);
  if (accessPoint != ResourceAccessPoint.SELF) {
    return [
      {
        group: "all",
        items: [
          resourceActions.star(),
          resourceActions.edit(accessPoint),
          resourceActions.pinToTopBar(),
          resourceActions.select(accessPoint),
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
        resourceActions.edit(accessPoint),
        resourceActions.copyLink()
      ]
    },
    {
      group: "more",
      items: [resourceActions.archive(), resourceActions.trash()]
    }
  ];
}
