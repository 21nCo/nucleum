import { Resource } from "@21n/data/datafn/resource.enum";
import { ActiveResourceStore } from "@21n/data/datafn/resource.store";
import {
  CollectionLayout,
  type IActiveCollection,
  type ICollectionItem,
  type ICollectionView,
  CollectionType,
  type ICollection,
  type ICollectionExpanded,
  type ICollectionViewCapture
} from "@21n/components/collection/collection.type";
import { propertyEditorStore } from "@21n/components/collection/properties/property.store";
import {
  AccessMode,
  ResourceAccessPoint,
  ResourceActionType
} from "@21n/data/datafn/resource.type";
import { ResourceActions } from "@21n/components/record/resource.actions";
import { logger } from "@21n/components/debug/logger.client";
import type { IRecordId } from "@21n/types/data.type";
import { generateResourceId } from "@21n/data/datafn/id.utils";
import {
  assignDefaultLabelAsFallback,
  serializePropertyForDatafn
} from "@21n/components/collection/properties/property.utils";
import {
  ContextMenuType,
  type IContextMenu,
  type IContextMenuItem
} from "@21n/types/select.type";
import context from "@21n/stores/context.store";
import { get } from "svelte/store";
import { resourceAction } from "@21n/data/datafn/resource.utils";
import { toasts } from "@21n/stores/notification.store";
import { dispatchCustomEvent } from "@21n/utils/browser.utils";
import { GlobalEvent } from "@21n/types/event.enum";
import { Embed } from "@21n/types/context.type";
import { appStore } from "@21n/stores/app.store";
import { datafn } from "@21n/stores/datafn.store";
import view from "@21n/stores/view.store";

const viewDefaults = {
  layout: CollectionLayout.BOARD,
  tabBy: "none",
  groupBy: "none",
  subGroupBy: "none"
};

function pruneUndefined(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );
}

function relationRefs(ids: IRecordId[]) {
  return ids.map((id, sortOrder) => ({
    $ref: id.toString(),
    sortOrder
  }));
}

export type IActiveCollectionStore = InstanceType<typeof ActiveCollectionStore>;

export class ActiveCollectionStore extends ActiveResourceStore<
  ICollectionExpanded,
  IActiveCollection
> {
  constructor(collectionId: IRecordId) {
    super(collectionId);
  }

  async modify(
    val: Partial<ICollectionExpanded> & {
      views?: IRecordId[] | IActiveCollection["views"];
    },
    params?: { isPreventBackPropagation?: boolean }
  ) {
    const shouldUpdateActive = !params?.isPreventBackPropagation;
    const previous = shouldUpdateActive ? this.get() : undefined;
    if (shouldUpdateActive) {
      this.update((prev) => ({ ...prev, ...val }) as IActiveCollection);
    }
    try {
      await datafn.collection.mutate({
        operation: "merge",
        id: this.id.toString(),
        record: pruneUndefined({
          id: this.id,
          ...val
        } as Record<string, unknown>)
      });
    } catch (error) {
      if (previous) this.set(previous);
      throw error;
    }
  }

  /**
   * Initialized the collection with local cached data
   */
  async init(accessMode: AccessMode) {
    logger.log({ at: "ActiveCollectionStore.init", id: this.id });
    try {
      this.update((val: IActiveCollection) => {
        if (val) val.isPageLoading = true;
        else val = { isPageLoading: true } as IActiveCollection;
        val.accessMode = accessMode;
        val.isInEditMode ??= false;
        return val;
      });
      let result: IActiveCollection | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        result = (await datafn.collection.select(this.id.toString(), {
          select: ["*", "views.*", "properties.*", "typeToExtend.*"],
          metadata: {
            includeTrashed: true,
            includeArchived: true
          }
        })) as unknown as IActiveCollection | undefined;
        if (result && Array.isArray(result.views)) break;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }
      logger.log({ at: "ActiveCollectionStore.init - select", result });
      let record = result;
      if (!record) return;
      const views = Array.isArray(record.views) ? record.views : [];
      this.set({
        ...record,
        accessMode,
        isInEditMode: record.isInEditMode ?? false,
        isPageLoading: false,
        properties: record.properties ?? [],
        views: views.map((x: ICollectionView) => {
          return { ...x, data: [] };
        })
      });
      propertyEditorStore.set({
        properties: record.properties ?? [],
        typeToExtend:
          record.typeToExtend && typeof record.typeToExtend === "object"
            ? record.typeToExtend
            : undefined
      });
      appStore.addToRecents({
        record,
        type: Resource.collection,
        timestamp: new Date()
      });
    } catch (e) {
      logger.error({
        at: "ActiveCollectionStore.init",
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
      const result = (await datafn.collection.select(this.id.toString(), {
        select: ["*", "properties.*", "typeToExtend.*"],
        metadata: {
          includeTrashed: true,
          includeArchived: true
        }
      })) as unknown as ICollectionExpanded | undefined;
      if (!result) return;
      this.update((val) => {
        val.properties = result.properties ?? [];
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
      if (!viewToBeDuplicated) return;
      const { id: _id, data: _data, ...duplicatedView } =
        viewToBeDuplicated as ICollectionView & { data?: unknown };
      view = duplicatedView;
    } else {
      view = {
        label: "New view"
      };
    }
    if (!view) return;
    const viewId = viewToDuplicate
      ? generateResourceId(Resource.view)
      : view.id ?? generateResourceId(Resource.view);
    const record = {
      ...viewDefaults,
      ...view,
      id: viewId
    };
    await datafn.view.mutate({
      operation: "insert",
      id: viewId,
      record
    });
    const response = [record] as ICollectionView[];
    logger.log({ at: "ActiveCollectionStore.createView", response });
    if (!response || !Array.isArray(response)) return;
    const createdView = response[0];
    if (!createdView || !createdView.id) return;

    this.update((val: IActiveCollection) => {
      val.views.push({ ...createdView, data: [] });
      return val;
    });

    await datafn.collection.mutate({
      operation: "relate",
      id: this.id.toString(),
      relations: {
        views: relationRefs(this.get().views.map((x) => x.id))
      }
    });
    return createdView.id;
  }

  async deleteView(id: string) {
    this.update((val: IActiveCollection) => {
      const viewToBeDeleted = val.views.find((v) => v.id == id);
      if (!viewToBeDeleted) return val;
      viewToBeDeleted.trashedAt = new Date();
      viewToBeDeleted.trashedBy = this.currentUserId ?? null;
      return val;
    });
    return datafn.view.mutate({
      operation: "trash",
      id
    });
  }

  updateView(id: IRecordId, view: Partial<ICollectionView>, key?: string) {
    this.update((val: IActiveCollection) => {
      val.views = val.views.map((v) => {
        if (v.id == id) return { ...v, ...view };
        return v;
      });
      return val;
    });
    datafn.view.mutate({
      operation: "merge",
      id,
      record: {
        id,
        ...view
      },
      debounceKey: key ?? id.toString(),
      debounceMs: 1500
    });
  }

  async updateProperties() {
    const propertiesEditor = propertyEditorStore.get();
    let properties = propertiesEditor.properties;
    properties = properties.map(assignDefaultLabelAsFallback);
    if (!properties) return;
    for (const property of properties) {
      await datafn.property.mutate({
        operation: "merge",
        id: property.id,
        record: serializePropertyForDatafn(property)
      });
    }
    const propertyIds = properties.map((p) => p.id);
    const result = await datafn.collection.mutate([
      {
        operation: "merge",
        id: this.id.toString(),
        record: pruneUndefined({
          id: this.id,
          typeToExtend: propertiesEditor.typeToExtend?.id ?? null
        } as Record<string, unknown>)
      },
      {
        operation: "relate",
        id: this.id.toString(),
        relations: {
          properties: relationRefs(propertyIds)
        }
      }
    ]);
    await this.refreshProperties();
    return result;
  }

  async selectItem(itemId: IRecordId) {
    const resource = itemId.split(":")[0];
    const result = await datafn.table(resource).query({
      filters: { id: itemId },
      limit: 1,
      metadata: {
        includeTrashed: true,
        includeArchived: true
      }
    } as any);
    return result.data?.[0] as ICollectionItem | undefined;
  }
}

export const collectionLayoutOptions = [
  {
    value: CollectionLayout.BOARD,
    icon: "lucide:layout-dashboard"
  },
  {
    value: CollectionLayout.TABLE,
    icon: "table",
    // badge: "Planned",
    isDisabled: true
  },
  {
    value: CollectionLayout.CALENDAR,
    icon: "calendar",
    // badge: "Planned",
    isDisabled: true
  },
  {
    value: CollectionLayout.MAP,
    icon: "map",
    // badge: "Planned",
    isDisabled: true
  }
];

export function resolveCollectionContextMenu(
  collection: ICollection,
  accessPoint: ResourceAccessPoint,
  params?: {
    accessPointId?: IRecordId;
    accessMode?: AccessMode;
    accessPointContext?: string;
    isConstrainedWidth?: boolean;
  }
): IContextMenu {
  const resourceActions = new ResourceActions(collection, {
    accessPoint,
    accessMode: params?.accessMode
  });
  const ctx = get(context);
  const viewStore = get(view);
  let commonGroups: { group: string; items: IContextMenuItem[] }[] = [];
  const moreGroup = {
    group: "more",
    items: [resourceActions.archive(), resourceActions.trash()]
  };
  if (ctx.isEmbed && ctx.embed === Embed.HANDSET) {
    commonGroups = [moreGroup];
  } else if (
    viewStore.isPortrait &&
    accessPoint === ResourceAccessPoint.SELF &&
    params?.accessMode === AccessMode.INLINE
  ) {
    commonGroups = [
      moreGroup,
      {
        group: "open",
        items: [resourceActions.maximize()]
      }
    ];
  } else {
    commonGroups = [
      {
        group: "open",
        items: [
          resourceActions.openAsTab(),
          // resourceActions.openAsSplit(),
          resourceActions.maximize()
        ]
      },
      moreGroup
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
      icon: "command",
      label: "Capture shortcut",
      type: ContextMenuType.SWITCH,
      initialValue: collection.isCaptureShortcutEnabled,
      callback: async (checked: boolean) => {
        const result = await datafn.collection.mutate({
          operation: "merge",
          id: collection.id,
          record: {
            isCaptureShortcutEnabled: checked
          }
        });
        if (result) {
          toasts.success("Capture shortcut updated");
        }
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
          icon: "convert",
          label: "Convert to Typed",
          callback: async () => {
            const result = await datafn.collection.mutate({
              operation: "merge",
              id: collection.id,
              record: {
                type: CollectionType.TYPED
              }
            });
            if (result) {
              toasts.success("Collection converted to typed");
            }
          }
        }
      ]
    },
    ...commonGroups
  ];
}
