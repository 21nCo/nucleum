import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import {
  activeResources,
  ActiveResourceStore,
  ResourceStore
} from "$lib/client/components/flux/resourceStores/resource.store";
import {
  CollectionLayout,
  type IActiveCollection,
  type ICollectionView,
  CollectionType,
  type ICollection,
  type ICollectionExpanded
} from "$lib/client/products/memotron/collection/collection.type";
import {
  propertyEditorStore,
  propertyStore
} from "./properties/property.store";
import { Arrangement } from "$lib/client/types/direction.enum";
import {
  ResourceAccessPoint,
  type OmitForCapture,
  type OmitForCaptureWithId
} from "$lib/client/components/flux/resourceStores/resource.type";
import { ResourceActions } from "../common/resource.actions";
import { logger } from "$lib/client/components/debug/logger.client";
import { flux } from "$lib/client/components/flux/flux";
import type { IRecordId } from "$lib/client/types/data.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import { assignDefaultLabelAsFallback } from "./properties/property.utils";
import type { IProperty } from "./properties/property.type";
import {
  ContextMenuType,
  type IContextMenu,
  type IContextMenuItem
} from "$lib/client/types/select.type";
import context from "$lib/client/stores/context.store";
import { get } from "svelte/store";
import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";

class CollectionStore extends ResourceStore<ICollection> {
  constructor() {
    super(Resource.collection);
  }
  async save(form: Partial<ICollection> & { defaultLayout: CollectionLayout }) {
    const id = generateResourceId(Resource.collection);
    const propertyEditor = propertyEditorStore.get();
    logger.log({ at: "CollectionStore.save", propertyEditor, form });
    let properties: OmitForCaptureWithId<IProperty>[] =
      propertyEditor.properties;
    const resource: OmitForCapture<ICollection> = {
      ...form,
      id,
      views: [],
      properties: [],
      defaultLayout: undefined,
      typeToExtend: propertyEditor.typeToExtend?.id ?? undefined,
      type: form.type ?? CollectionType.UNTYPED
    };
    if (form.type === CollectionType.TYPED && properties?.length > 0) {
      properties = properties.map(assignDefaultLabelAsFallback);
      await propertyStore.create(properties);
      resource.properties = properties.map((p) => p.id);
    }
    const viewId = generateResourceId(Resource.view);
    await viewStore.create({
      id: viewId,
      layout: form.defaultLayout,
      label: "Default",
      tabBy: "none",
      groupBy: "none",
      subGroupBy: "none"
    });
    resource.views = [viewId];
    return super.create(resource);
  }

  /**
   * TODO - testing extended properties
   * @param collections - ids of collections - can be any type of collection.
   * @returns
   */
  async resolveTypes(
    collections: IRecordId[],
    isFromExtension: boolean = false
  ) {
    let types: ICollectionExpanded[] = [];
    if (!collections) return types;

    if (isFromExtension) {
      const result = await this.select(collections[0]);
      if (!result) return types;
      console.log({ at: "resolveTypes - isFromExtension", result });
      if (!result || result.type !== CollectionType.TYPED) return [];
      if (!result.properties && !result.typeToExtend) return [result];
      let typeToExtend: ICollection | undefined;
      if (result.typeToExtend) {
        typeToExtend = await this.select(result.typeToExtend);
      }
      const properties = await propertyStore.selectMany({
        filters: {
          id: [
            ...(result.properties ?? []),
            ...(typeToExtend?.properties ?? [])
          ]
        }
      });
      console.log({
        at: "resolveTypes - isFromExtension",
        typeToExtend,
        properties
      });
      if (!typeToExtend) return [{ ...result, properties }];
      const mainProps = result.properties?.map((x) => {
        const property = properties.find(resourceInList(x));
        return { ...property };
      });
      const extendedProps = typeToExtend.properties?.map((x) => {
        const property = properties.find(resourceInList(x));
        return { ...property };
      });
      return [
        {
          ...result,
          properties: mainProps,
          typeToExtend,
          extendProperties: extendedProps
        }
      ];
    }
    const result = await this.selectMany({
      properties: [
        "*",
        "typeToExtend.* as typeToExtend",
        "(select * from $parent.properties) as properties",
        "(select * from $parent.typeToExtend.properties) as extendProperties"
      ],
      filters: {
        id: collections.map((x) => x.toString())
      }
    });
    logger.log({ at: "resolveTypes", result });
    if (!result || !Array.isArray(result)) return types;
    types = result.filter((x) => x.type === CollectionType.TYPED);
    return types;
  }

  async fetchDerivedCollections(collectionId: IRecordId) {
    return this.selectMany({
      filters: {
        typeToExtend: collectionId.toString()
      }
    });
  }
}

export const collectionStore = new CollectionStore();

export type IActiveCollectionStore = InstanceType<typeof ActiveCollectionStore>;

/**
 *
 * @deprecated - use ActiveCollectionStore.resolve instead
 *
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

export class ActiveCollectionStore extends ActiveResourceStore<
  IActiveCollection,
  CollectionStore
> {
  constructor(collectionId: IRecordId) {
    super(collectionId, collectionStore);
  }

  /**
   * Initialized the collection with local cached data
   */
  async init() {
    logger.log({ at: "ActiveCollectionStore.init", id: this.id });
    try {
      this.update((val: IActiveCollection) => {
        if (val) val.isPageLoading = true;
        else val = { isPageLoading: true };
        return val;
      });
      const result = await flux.select(this.id, [
        "*",
        "(select * from $parent.views) as views",
        "(select * from $parent.properties) as properties",
        "typeToExtend.* as typeToExtend"
      ]);
      logger.log({ at: "ActiveCollectionStore.init - select", result });
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
      propertyEditorStore.set({
        properties: record.properties ?? [],
        typeToExtend: record.typeToExtend
      });
    } catch (e) {
      console.error("error in init collection store", {
        id: this.id,
        error: e
      });
    }
  }

  async createView(viewToDuplicate?: IRecordId) {
    let viewToBeDuplicated: ICollectionView | undefined;
    let view: OmitForCapture<ICollectionView> | undefined;
    if (viewToDuplicate) {
      const collection = this.get();
      viewToBeDuplicated = collection.views.find(
        (v) => v.id == viewToDuplicate
      );
      view = viewToBeDuplicated as ICollectionView;
    } else {
      view = {
        label: "New view",
        layout: CollectionLayout.BOARD,
        tabBy: "none",
        groupBy: "none",
        subGroupBy: "none",
        arrangement: Arrangement.LIST
      };
    }
    const response = await viewStore.create(view);
    logger.log({ at: "ActiveCollectionStore.createView", response });
    if (!response || !Array.isArray(response)) return;
    const createdView = response[0];
    if (!createdView || !createdView.id) return;

    this.update((val: IActiveCollection) => {
      val.views.push({ ...createdView, data: [] });
      return val;
    });

    this.resourceStore.modify(
      this.id,
      {
        views: [...(this.get().views.map((x) => x.id) ?? [])]
      },
      {
        isPreventBackPropagation: true
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
    return viewStore.trash(id);
  }

  updateView(id: IRecordId, view: Partial<ICollectionView>, key?: string) {
    this.update((val: IActiveCollection) => {
      val.views = val.views.map((v) => {
        if (v.id == id) return { ...v, ...view };
        return v;
      });
      return val;
    });
    viewStore.modify(id, view, {
      isDebounced: true,
      debounceKey: key ?? id.toString()
    });
  }

  /**
   * Fetches the view data from the server and updates the store with the new data. Sets the isViewDataLoading flag to true unlike {@link refreshViewData} which sets isViewDataRefreshing to true and refreshError if any error occurs.
   * @param viewId
   * @returns
   */
  async loadViewData(viewId: IRecordId) {
    logger.log({ at: "ActiveCollectionStore.loadViewData", viewId });
    if (!viewId) return;
    this.update((val: IActiveCollection) => {
      val.isViewDataLoading = true;
      return val;
    });
    const response = await viewStore.fetchViewData(viewId, this.get().id);
    logger.log({
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
      const view = val.views.find(resourceInList(viewId));
      val.isViewDataLoading = false;
      if (!view) {
        return val;
      }
      view.data = [...response];
      return val;
    });
    return true;
  }

  /**
   * Fetches the view data from the server and updates the store with the new data.
   * @param viewId
   * @returns
   */
  async refreshViewData(viewId: IRecordId) {
    logger.log({ at: "ActiveCollectionStore.refreshViewData", viewId });
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
      const view = val.views.find(resourceInList(viewId));
      if (!view) {
        val.isViewDataRefreshing = false;
        return val;
      }
      view.data = [...response];
      val.isViewDataRefreshing = false;
      return val;
    });
    return true;
  }

  async updateProperties() {
    const propertiesEditor = propertyEditorStore.get();
    let properties = propertiesEditor.properties;
    properties = properties.map(assignDefaultLabelAsFallback);
    if (!properties) return;
    for (const property of properties) {
      await propertyStore.modify(property.id, property);
    }
    return this.resourceStore.modify(
      this.id,
      {
        properties: properties.map((p) => p.id),
        typeToExtend: propertiesEditor.typeToExtend?.id ?? undefined
      },
      {
        isPreventBackPropagation: true
      }
    );
  }
}

class CollectionViewStore extends ResourceStore<ICollectionView> {
  constructor() {
    super(Resource.view, {
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
    icon: "lucide:layout-dashboard"
  },
  {
    value: CollectionLayout.TABLE,
    icon: "ph:table-light",
    // badge: "Planned",
    isDisabled: true
  },
  {
    value: CollectionLayout.CALENDAR,
    icon: "ph:calendar-dots-light",
    // badge: "Planned",
    isDisabled: true
  },
  {
    value: CollectionLayout.MAP,
    icon: "ph:map-trifold-light",
    // badge: "Planned",
    isDisabled: true
  }
];

export function resolveCollectionContextMenu(
  collection: ICollection,
  accessPoint: ResourceAccessPoint
): IContextMenu {
  const resourceActions = new ResourceActions(collection, collectionStore);
  const ctx = get(context);
  let commonGroups: { group: string; items: IContextMenuItem[] }[] = [];
  if (ctx.isEmbed) {
    commonGroups = [
      {
        group: "more",
        items: [resourceActions.archive(), resourceActions.trash()]
      }
    ];
  } else {
    commonGroups = [
      {
        group: "open",
        items: [
          resourceActions.openAsTab(),
          // resourceActions.openAsSplit(),
          resourceActions.openAsFull()
        ]
      },
      {
        group: "more",
        items: [resourceActions.archive(), resourceActions.trash()]
      }
    ];
  }
  if (accessPoint != ResourceAccessPoint.SELF) {
    return [
      {
        group: "all",
        items: [
          resourceActions.star(),
          resourceActions.select(accessPoint),
          resourceActions.edit(accessPoint),
          resourceActions.copyLink()
        ]
      },
      ...commonGroups
    ];
  } else if (collection.type === CollectionType.TYPED) {
    return [
      {
        group: "all",
        items: [
          resourceActions.star(),
          resourceActions.edit(accessPoint),
          // {
          //   value: "share",
          //   icon: "ph:share-light",
          //   label: "Share",
          //   callback: async () => {}
          // },
          resourceActions.copyLink(),
          {
            value: "captureshortcut",
            icon: "ph:arrow-up-right-light",
            label: "Capture shortcut",
            type: ContextMenuType.SWITCH,
            initialValue: collection.isCaptureShortcutEnabled,
            callback: async (checked) => {
              console.log({ checked });
              return collectionStore.modify(collection.id, {
                isCaptureShortcutEnabled: checked
              });
            }
          }
        ]
      },
      ...commonGroups
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
    ...commonGroups
  ];
}
