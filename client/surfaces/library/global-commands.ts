import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction, IActionFnParams } from "@nucleum/shared-state/commands/action.type";
import { Size } from "@21n/ui/elements/size.enum";
import { Orientation } from "@21n/ui/elements/direction.enum";
import { Action } from "@nucleum/client/config/action.enum";
import { type IMultiSelectStore } from "@nucleum/datafn/resource.type";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import {
  determineResourceType,
  resourceAction
} from "@nucleum/datafn/resource.utils";
import { Resource } from "@nucleum/datafn/resource.enum";
import { ResourceError } from "@nucleum/datafn/resource-error";
import { ResourceErrorCode } from "@nucleum/schema/resource-error.enum";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { toasts } from "@nucleum/shared-state/notifications/notification.store";
import NodeLoadingPulse from "@21n/ui/elements/feedback/animations/NodeLoadingPulse.svelte";
import LinkSearchResultItem from "@nucleum/features/memory/common/linkbox/LinkSearchResultItemDummy.svelte";
import { queryLinkingSearchResults } from "@nucleum/features/memory/linking/link-search";
import { recentsStore } from "@nucleum/shared-state/resources/recent.store";
import { isValidString } from "@21n/shared-utils/text.utils";
import ResourceBrowser from "@nucleum/surfaces/library/resourceBrowser/ResourceBrowser.svelte";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
import context from "@nucleum/client/runtime/context.store";
import { activeResourceFilter } from "@nucleum/datafn/resource-filters";
import DatafnSharePanel from "@nucleum/surfaces/sharing/DatafnSharePanel.svelte";
import { datafn } from "@nucleum/datafn/datafn.store";
import {
  addDatafnRecordToCollection,
  relateDatafnRecords
} from "@nucleum/datafn/datafn-linking.store";

function isCollectionItemResource(resource: Resource) {
  return resource === Resource.node || resource === Resource.objective;
}

/** Commands owned by library; assembled in application composition. */
export const libraryCommands = {
  resourceMetadata: [
    Resource.collection,
    Resource.node,
    Resource.objective,
    Resource.task,
    Resource.session,
    Resource.event,
    Resource.file,
    Resource.space
  ].map((resource) => ({
    action: resourceAction(resource, ResourceActionType.SHARE),
    component: DatafnSharePanel,
    label: "Share",
    icon: "share",
    type: ActionType.MODAL,
    componentParams: {
      resource
    },
    modalParams: {
      title: "Share",
      layout: {
        size: Size.md,
        orientation: Orientation.Vertical,
        ignoreSafeArea: true
      }
    }
  })),
  collection_browse: {
    action: resourceAction(Resource.collection, ResourceActionType.BROWSE),
    component: ResourceBrowser,
    label: "Collections",
    icon: "collection",
    type: ActionType.PAGE,
    componentParams: {
      resource: Resource.collection
    },
    loadingComponent: NodeLoadingPulse
  },
  event_browse: {
    action: resourceAction(Resource.event, ResourceActionType.BROWSE),
    component: ResourceBrowser,
    label: "Events",
    icon: "calendar-blank",
    type: ActionType.PAGE,
    componentParams: {
      resource: Resource.event
    },
    loadingComponent: NodeLoadingPulse
  },
  tag_browse: {
    action: resourceAction(Resource.tag, ResourceActionType.BROWSE),
    component: ResourceBrowser,
    label: "Tags",
    icon: "tag",
    isInactive: true,
    type: ActionType.PAGE,
    componentParams: {
      resource: Resource.tag
    }
  },
  add_item_to_collection: {
    action: Action.ADD_ITEM_TO_COLLECTION,
    type: ActionType.SEARCH_CMD,
    cmdLabel: "Add to collection",
    isMeta: true,
    searchActionParams: {
      placeholder: "select an item to add to this collection",
      searchResultComponent: LinkSearchResultItem,
      searchCallback: async (query: string, componentParams?: any) => {
        const resource = componentParams?.resource ?? Resource.node;
        if (isValidString(query)) {
          const result = await datafn.search({
            query,
            resources: [resource],
            limit: 50,
            limitPerResource: 50,
            source: "local",
            prefix: true,
            fuzzy: 0.2
          });
          return (result.results?.map((entry: any) => entry.data) ?? []).filter(
            activeResourceFilter
          );
        } else {
          return recentsStore.resolve({ type: resource });
        }
      },
      callback: async (item: any, componentParams?: any) => {
        try {
          if (!componentParams?.id) {
            toasts.error();
            return;
          }
          const resource = determineResourceType(item.id);
          if (!isCollectionItemResource(resource)) {
            toasts.error();
            return;
          }
          const result = await addDatafnRecordToCollection({
            sourceId: item.id,
            collectionId: componentParams.id,
            context: componentParams.id.toString()
          });
          logger.log({
            at: "addNodeToCollection",
            id: item.id,
            label: item.label,
            componentParams,
            result
          });
          if (result === 0) {
            toasts.error("Already added to collection");
            return;
          }
          toasts.success(`**${item.label}** added to collection`);
        } catch (e) {
          logger.error({ at: "addNodeToCollection", error: e });
          if (e instanceof ResourceError) {
            if (e.code === ResourceErrorCode.ALREADY_EXISTS) {
              toasts.error("Already added to collection");
            } else {
              toasts.error();
            }
          } else {
            toasts.error();
          }
        }
      }
    }
  },
  bulk_link: {
    action: Action.BULK_LINK,
    type: ActionType.SEARCH_CMD,
    cmdLabel: "Link to a node or add to a collection",
    isMeta: true,
    searchActionParams: {
      searchCallback: async (search: string, componentParams?: any) => {
        const collectionResource = componentParams?.items?.[0]
          ? [determineResourceType(componentParams.items[0])]
          : [];
        return await queryLinkingSearchResults(search, {
          resource: componentParams?.resource,
          collectionResource:
            componentParams?.collectionResource ?? collectionResource
        });
      },
      placeholder: (componentParams?: any) => {
        return componentParams?.resource === Resource.collection
          ? "select a collection"
          : componentParams?.resource === Resource.node
            ? "select a node"
            : "select a node or a collection";
      },
      searchResultComponent: LinkSearchResultItem,
      callback: async (
        item: any,
        componentParams?: {
          multiSelectStore?: IMultiSelectStore;
          items?: IRecordId[];
        }
      ) => {
        try {
          const items =
            componentParams?.multiSelectStore?.get() ?? componentParams?.items;
          const context = componentParams?.multiSelectStore?.context;
          if (!items) {
            toasts.error(undefined, {
              closeProgressId: "bulklink"
            });
            return;
          }
          const resourceType = determineResourceType(item.id);
          toasts.showProgress(
            "bulklink",
            resourceType === Resource.collection
              ? "Adding to collection"
              : "Linking to node"
          );
          const result = await relateDatafnRecords({
            sourceIds: items,
            targetId: item.id,
            context: context?.accessPoint
          });
          logger.log({
            at: "bulkLink",
            id: item.id,
            resourceType,
            label: item.label,
            items,
            result
          });
          componentParams?.multiSelectStore?.reset();
          if (resourceType === Resource.collection) {
            toasts.success(
              `**${items.length}** ${
                items.length > 1 ? "items" : "item"
              } added to collection ${item.label ? `**${item.label}**` : ""}`,
              {
                closeProgressId: "bulklink"
              }
            );
          } else {
            toasts.success(
              `**${items.length}** ${
                items.length > 1 ? "items" : "item"
              } linked to node ${item.label ? `**${item.label}**` : ""}`,
              {
                closeProgressId: "bulklink"
              }
            );
          }
        } catch (e) {
          logger.error({ at: "bulkLink", error: e });
          toasts.error(undefined, {
            closeProgressId: "bulklink"
          });
        }
      }
    }
  },
  browse: {
    action: ResourceActionType.BROWSE,
    component: ResourceBrowser,
    type: ActionType.FUNCTION,
    fn: async (params?: IActionFnParams) => {
      const resource = params?.componentParams?.resource;
      requireCommandHost().runAction(
        resourceAction(resource, ResourceActionType.BROWSE),
        {
          searchParams: {
            [AppSearchParam.RETURN_TO]:
              params?.componentParams?.[AppSearchParam.RETURN_TO] ?? "home"
          }
        }
      );
    }
  }
} satisfies Record<string, IAction | IAction[]>;
