import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import {
  ActiveResourceStore,
  ResourceStore
} from "$lib/client/components/flux/resourceStores/resource.store";
import {
  CollectionLayout,
  type IActiveCollection,
  type ICollectionView,
  CollectionType,
  type ICollection,
  type ICollectionExpanded,
  CollectionObjectKey,
  type ICollectionCapture,
  type ICollectionViewCapture
} from "$lib/client/components/collection/collection.type";
import {
  propertyEditorStore,
  propertyStore
} from "./properties/property.store";
import { Arrangement } from "$lib/client/types/direction.enum";
import {
  ResourceAccessMode,
  ResourceAccessPoint,
  ResourceActionType,
  type OmitForCapture,
  type OmitForCaptureWithId
} from "$lib/client/components/flux/resourceStores/resource.type";
import { ResourceActions } from "$lib/client/components/record/resource.actions";
import { logger } from "$lib/client/components/debug/logger.client";
import { flux } from "$lib/client/components/flux/flux";
import {
  StoreDataType,
  type IRecordId,
  type IResourceSelectAdditionalParams,
  type IResourceSelectParams
} from "$lib/client/types/data.type";
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
import {
  isRecordId,
  resourceAction,
  resourceInList
} from "$lib/client/components/flux/resourceStores/resource.utils";
import { toasts } from "$lib/client/stores/notification.store";
import { dispatchCustomEvent } from "$lib/client/utils/browser.utils";
import { GlobalEvent } from "$lib/client/types/event.enum";
import { Embed } from "$lib/client/types/context.type";
import { appStore } from "$lib/client/stores/app.store";
import { resolveCollectionResource } from "./collection.utils";
import { viewStore } from "./view.store";

const defaults: Partial<ICollection> = {
  type: CollectionType.UNTYPED,
  typeToExtend: "",
  resource: Resource.node
};
class CollectionStore extends ResourceStore<ICollection, ICollectionCapture> {
  collectibleResource: Resource[] | undefined;
  constructor() {
    super(Resource.collection, {
      dataType: StoreDataType.FIR,
      defaultProps: defaults,
      indices: ["type", "resource", CollectionObjectKey.typeToExtend],
      expandProps: [CollectionObjectKey.typeToExtend]
    });
    this.refreshCollectibleResource();
  }

  refreshCollectibleResource() {
    this.collectibleResource = resolveCollectionResource(get(appStore).product);
  }

  selectMany(
    params?: IResourceSelectParams,
    additionalParams?: IResourceSelectAdditionalParams
  ) {
    this.refreshCollectibleResource();

    if (additionalParams?.isQueryAsIs) {
      return super.selectMany(
        {
          ...(params ?? {})
        },
        additionalParams
      );
    }
    const filters = {
      ...(params?.filters ?? {}),
      type:
        params?.filters && "type" in params.filters && params?.filters?.type
          ? params.filters.type?.toUpperCase()
          : undefined,
      ...(this.collectibleResource
        ? {
            resource: this.collectibleResource
          }
        : {})
    };
    params = {
      ...(params ?? {}),
      filters
    };
    return super.selectMany(params, additionalParams);
  }

  async save(
    form: ICollectionCapture,
    additionalParams?: {
      context?: string;
      isIgnorePropertyEditor?: boolean;
    }
  ) {
    this.refreshCollectibleResource();
    const propertyEditor = additionalParams?.isIgnorePropertyEditor
      ? null
      : propertyEditorStore.get();
    logger.log({ at: "CollectionStore.save", propertyEditor, form });
    let properties: OmitForCaptureWithId<IProperty>[] =
      propertyEditor?.properties ?? [];
    const record: ICollectionCapture = {
      label: form.label ?? "",
      description: form.description,
      isStarred: form.isStarred,
      isCaptureShortcutEnabled: form.isCaptureShortcutEnabled,
      views: [],
      properties: [],
      typeToExtend: propertyEditor?.typeToExtend?.id ?? defaults.typeToExtend,
      type: form.type ?? defaults.type,
      resource: form.resource ?? this.collectibleResource?.[0],
      ...(form.avatar ? { avatar: form.avatar } : {}),
      ...(form.cover ? { cover: form.cover } : {}),
      ...(form.query ? { query: form.query } : {})
    };
    if (form.type === CollectionType.TYPED && properties?.length > 0) {
      properties = properties.map(assignDefaultLabelAsFallback);
      await propertyStore.create(properties);
      record.properties = properties.map((p) => p.id);
    }
    const viewId = generateResourceId(Resource.view);
    await viewStore.create({
      id: viewId,
      layout: form.defaultLayout ?? CollectionLayout.BOARD,
      label: "Default"
    });
    record.views = [viewId];
    appStore.addToRecents({
      record,
      type: Resource.collection,
      timestamp: new Date()
    });
    return super.create(record, additionalParams);
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
      if (!result || result.type !== CollectionType.TYPED) return [];
      if (!result.properties && !result.typeToExtend) return [result];
      let typeToExtend: ICollection | undefined;
      if (isRecordId(result.typeToExtend)) {
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
    const oldProps = [
      "(select * from $parent.properties) as properties",
      "(select * from $parent.typeToExtend.properties) as extendProperties"
    ];
    //TODO - extendProperties nested expansion
    const result = await this.selectMany(
      {
        properties: {
          expand: ["properties", "typeToExtend"]
        },
        filters: {
          id: collections.map((x) => x.toString())
        }
      },
      {
        isExpand: true
      }
    );
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

export class ActiveCollectionStore extends ActiveResourceStore<
  ICollection,
  CollectionStore,
  IActiveCollection
> {
  constructor(collectionId: IRecordId) {
    super(collectionId, collectionStore);
  }

  /**
   * Initialized the collection with local cached data
   */
  async init(accessMode: ResourceAccessMode) {
    logger.log({ at: "ActiveCollectionStore.init", id: this.id });
    try {
      this.update((val: IActiveCollection) => {
        if (val) val.isPageLoading = true;
        else val = { isPageLoading: true };
        val.accessMode = accessMode;
        return val;
      });
      console.time("ActiveCollectionStore.init - select");
      const oldProps = [
        "*",
        "(select * from $parent.views) as views",
        "(select * from $parent.properties) as properties",
        "typeToExtend.* as typeToExtend"
        // "(array::first(select out, count() from link where out is $parent.id group by out)).count as totalNodeCount"
      ];
      const result = await this.resourceStore.select(this.id, {
        expand: ["views", "properties", "typeToExtend"]
      });
      console.timeEnd("ActiveCollectionStore.init - select");
      logger.log({ at: "ActiveCollectionStore.init - select", result });
      let record = result;
      if (!record) return;
      this.set({
        ...record,
        accessMode,
        isViewDataLoading: true,
        isPageLoading: false,
        properties: record.properties ?? [],
        views: record.views.map((x) => {
          return { ...x, data: [] };
        })
      });
      propertyEditorStore.set({
        properties: record.properties ?? [],
        typeToExtend: record.typeToExtend
      });
      appStore.addToRecents({
        record,
        type: Resource.collection,
        timestamp: new Date()
      });
    } catch (e) {
      console.error("error in init collection store", {
        id: this.id,
        error: e
      });
    }
  }

  async refreshProperties() {
    logger.log({
      at: "ActiveCollectionStore.refreshProperties",
      id: this.id
    });
    try {
      const result = await this.resourceStore.select(this.id, {
        expand: ["properties", "typeToExtend"]
      });
      if (!result) return;
      this.update((val) => {
        val.properties = result.properties;
        val.typeToExtend = result.typeToExtend;
        return val;
      });
    } catch (e) {
      logger.error({ at: "ActiveCollectionStore.refreshProperties", e });
    }
  }

  async createView(viewToDuplicate?: IRecordId) {
    let viewToBeDuplicated: ICollectionView | undefined;
    let view: ICollectionViewCapture | undefined;
    if (viewToDuplicate) {
      const collection = this.get();
      viewToBeDuplicated = collection.views.find(
        (v) => v.id == viewToDuplicate
      );
      view = viewToBeDuplicated as ICollectionView;
    } else {
      view = {
        label: "New view"
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
        deletedAt: new Date(),
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
   * Fetches the view data from the server and updates the store with the new data.
   * @param viewId
   * @returns
   */
  async loadViewData(
    viewId: IRecordId,
    resourceStore: ResourceStore<any, any>,
    isFirstLoad: boolean = false
  ) {
    try {
      logger.log({ at: "ActiveCollectionStore.loadViewData", viewId });
      if (!viewId) return;
      const collection = this.get();
      let view = collection.views.find(resourceInList(viewId));
      if (!view) return;
      this.update((val: IActiveCollection) => {
        val.isViewDataLoading = true;
        return val;
      });
      console.time("ActiveCollectionStore.loadViewData - fetchViewData");
      const response = await viewStore.fetchViewData(
        collection.id,
        resourceStore,
        {
          view,
          resource: collection.resource
        }
      );
      console.timeEnd("ActiveCollectionStore.loadViewData - fetchViewData");
      logger.log({
        at: "ActiveCollectionStore.loadViewData - response",
        view,
        response
      });
      if (!response || !isValidArrayWithData(response.items)) {
        this.update((val: IActiveCollection) => {
          val.isViewDataLoading = false;
          return val;
        });
        return;
      }
      this.update((val: IActiveCollection) => {
        val.isViewDataLoading = false;
        view.data = [...response.items];
        val.totalItemCount = response.totalCount;
        return val;
      });
      return true;
    } catch (e) {
      logger.error({
        at: "ActiveCollectionStore.loadViewData - error",
        error: e
      });
      return false;
    }
  }

  async updateProperties() {
    const propertiesEditor = propertyEditorStore.get();
    let properties = propertiesEditor.properties;
    properties = properties.map(assignDefaultLabelAsFallback);
    if (!properties) return;
    for (const property of properties) {
      await propertyStore.modify(property.id, property);
    }
    const result = await this.resourceStore.modify(
      this.id,
      {
        properties: properties.map((p) => p.id),
        typeToExtend: propertiesEditor.typeToExtend?.id ?? undefined
      },
      {
        isPreventBackPropagation: true
      }
    );
    dispatchCustomEvent(GlobalEvent.RELOAD_RESOURCE, {
      id: this.id
    });
    return result;
  }

  async selectItem(itemId: IRecordId) {
    const result = await flux.select(itemId);
    if (!result) return;
    return result;
  }
}

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
  const resourceActions = new ResourceActions(
    collection,
    collectionStore,
    accessPoint
  );
  const ctx = get(context);
  let commonGroups: { group: string; items: IContextMenuItem[] }[] = [];
  if (ctx.isEmbed && ctx.embed === Embed.HANDSET) {
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
          //TODO - clicking edit should open edit mode - not opening for Collection
          // resourceActions.edit(accessPoint),
          resourceActions.copyLink()
        ]
      },
      ...commonGroups
    ];
  } else if (collection.type === CollectionType.TYPED) {
    const captureToggle = {
      value: "captureshortcut",
      icon: "ph:arrow-up-right-light",
      label: "Capture shortcut",
      type: ContextMenuType.SWITCH,
      initialValue: collection.isCaptureShortcutEnabled,
      callback: async (checked) => {
        console.log({ checked });
        const result = await collectionStore.modify(collection.id, {
          isCaptureShortcutEnabled: checked
        });
        if (result) {
          toasts.success("Capture shortcut updated");
        }
        return result;
      }
    };
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
            value: "convert",
            icon: "ph:arrows-clockwise-light",
            label: "Convert as Simple",
            callback: async () => {
              const result = await collectionStore.modify(collection.id, {
                type: CollectionType.UNTYPED
              });
              if (result) {
                toasts.success("Collection converted to simple");
              }
              return result;
            }
          },
          ...(!collection.resource || collection.resource === Resource.node
            ? [captureToggle]
            : []),
          {
            value: "editProperties",
            icon: "ph:cube-light",
            label: "Edit properties",
            callback: async () => {
              appStore.runAction(
                resourceAction(Resource.property, ResourceActionType.EDIT),
                {
                  componentParams: {
                    id: collection?.id
                  }
                }
              );
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
        resourceActions.copyLink(),
        {
          value: "convert",
          icon: "ph:arrows-clockwise-light",
          label: "Convert to Typed",
          callback: async () => {
            console.log({ at: "resolveCollectionContextMenu.convert" });
            const result = await collectionStore.modify(collection.id, {
              type: CollectionType.TYPED
            });
            if (result) {
              toasts.success("Collection converted to typed");
            }
            return result;
          }
        }
      ]
    },
    ...commonGroups
  ];
}
