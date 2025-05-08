import {
  headingNodeTypes,
  NodeType,
  rootNodeTypeList
} from "$lib/client/products/memotron/node/node.type";
import { activeResourceFilter, activeResourceFilterV2 } from "$lib/client/utils/utils";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { isValidString } from "$lib/shared/utils/text.utils";
import {
  SearchType,
  type IRecordId,
  type IResourceSelectFilters,
  type IResourceSelectOrderBy
} from "$lib/client/types/data.type";
import { flux } from "$lib/client/components/flux/flux";
import { logger } from "$lib/client/components/debug/logger.client";
import { isValidArray } from "$lib/shared/utils/obj.utils";
import { toasts } from "$lib/client/stores/notification.store";
import { extensionFlux } from "$lib/client/components/flux/fluxExtentionMediator";
import { FluxMethod } from "$lib/client/components/flux/flux.type";
import type { CollectionType } from "$lib/client/components/collection/collection.type";
import { collectionStore } from "$lib/client/components/collection/collection.store";
import { nodeStore } from "$lib/client/products/memotron/node/node.store";
import type {
  MultiSelectStore,
  ResourceStore
} from "$lib/client/components/flux/resourceStores/resource.store";
import { appStore } from "$lib/client/stores/app.store";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import {
  highlightSearchQuery,
  searchSort
} from "$lib/client/products/memotron/memotron.utils";
import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
import { recentsStore } from "./recent.store";
import { get } from "svelte/store";
import { resolveCollectionResource } from "../collection/collection.utils";
import { goalStore } from "../goals/goal.store";
import { Action } from "$lib/client/types/action.enum";
import { localCacheableStores, remoteOnlyStores } from "$local/localStoresMap";
import { searcheableResources } from "$local/local";
import { taskStore } from "../tasks/task.store";
import { resolveUnixTimestamp } from "$lib/shared/utils/time.utils";

export const MAX_FILE_SIZE_MB = 100;

export function resolveResource(id: IRecordId) {
  return flux.select(id);
}

const labelSearchProp =
  "search::highlight('**', '**', 1, false) AS labelSearch";

function resolveSearchProperties(resource: Resource) {
  switch (resource) {
    case Resource.node:
      return ["label", "text"];
    default:
      return ["label"];
  }
}

export class SearchStore {
  resource: Resource = Resource.everything;
  dev_isUseIndexSearch: boolean = false;
  collectibleResource: Resource[] | undefined;
  resourceStore: ResourceStore<any> | undefined;
  constructor(resource: Resource = Resource.everything) {
    this.resource = resource;
    this.collectibleResource = resolveCollectionResource(get(appStore).product);
    if (resource !== Resource.everything) {
      this.setResourceStore(resource);
    }
  }

  setResourceStore(resource: Resource) {
    this.resourceStore = [...localCacheableStores, ...remoteOnlyStores].find(
      (store) => store.id === resource
    ) as ResourceStore<any>;
  }

  levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   *
   * @deprecated - use nodeStore.selectMany or searchStore.select instead
   * TODO - group by mdParent if searching
   *
   *
   * this is causing extreme slowness for select query if there are 1000s of records on the table if used in select query prop
   * "(fn::memotron::node::parent($parent.id)) as mdParent"
   *
   * @returns
   */
  async nodes(params: any) {
    console.log("record.store.ts - nodes");
    const result = await flux.selectMany(
      params.searchType == SearchType.SEMANTIC && params.searchQuery
        ? Resource.vector
        : Resource.node,
      {
        properties:
          params.searchType === SearchType.SEMANTIC && params.searchQuery
            ? [
                "node.body as body",
                "node.children as children",
                "node.contentType as contenType",
                "node.createdAt as createdAt",
                "node.createdBy as createdBy",
                "node.id as id",
                "node.isArchived as isArchived",
                "node.isStarred as isStarred",
                "node.label as label",
                "node.text as text",
                "node.metadata as metadata",
                "node.modifiedAt as modifiedAt",
                "node.modifiedBy as modifiedBy",
                "node.properties as properties",
                "node.parent.* as parent",
                "node.file.* as file"
              ]
            : [
                "*",
                "parent.* as parent",
                "file.* as file",
                labelSearchProp,
                "search::highlight('**', '**', 2, false) AS bodySearch"
              ],
        filters:
          params.searchType == SearchType.SEMANTIC && params.searchQuery
            ? {}
            : {
                creationContext:
                  isValidString(params.searchQuery) ||
                  params.filters.contentType
                    ? undefined
                    : false,
                ...params.filters,
                isArchived: params.filters.isArchived ?? false,
                contentType:
                  "contentType" in params.filters
                    ? params.filters.contentType?.toUpperCase()
                    : params.searchQuery
                      ? undefined
                      : rootNodeTypeList
              }
      },
      {
        isCloudOnlyResource:
          params.searchType === SearchType.SEMANTIC &&
          isValidString(params.searchQuery)
            ? true
            : false
      }
    );
    console.log("record.store.ts - nodes - result");
    logger.log({ at: "refreshNodes", result });

    // const result2 = await flux.selectByQuery("select * from node;");
    // logger.log({ at: "all nodes: ", result2 });
    return result;
  }

  async select(params: {
    resource?: Resource;
    searchQuery?: string;
    limit?: number | undefined;
    offset?: number;
    orderBy?: IResourceSelectOrderBy | undefined;
    filters?: IResourceSelectFilters;
    searchType?: SearchType;
    semanticSearchTopK?: number | undefined;
    isIncludeSubItems?: boolean;
    isIgnoreParentInactive?: boolean;
  }) {
    this.resource = params.resource ?? this.resource;
    logger.log({
      at: "SearchStore.refresh",
      params
    });
    let data: any;
    const selectParams = {
      properties: [labelSearchProp],
      filters: params.filters,
      search: isValidString(params.searchQuery)
        ? {
            query: params.searchQuery!,
            properties: resolveSearchProperties(this.resource)
          }
        : undefined,
      limit: params.limit,
      offset: params.offset,
      orderBy: params.orderBy ?? {
        modifiedAt: "desc"
      },
      searchType: params.searchType,
      semanticSearchTopK: params.semanticSearchTopK
    };
    if (this.resource === Resource.everything) {
      data = (
        await Promise.all(
          searcheableResources.map(async (resource) => {
            if (isValidString(params.searchQuery)) {
              selectParams.search = {
                query: params.searchQuery!,
                properties: resolveSearchProperties(resource)
              };
            }
            this.setResourceStore(resource);
            const result = await this.resourceStore?.selectMany(selectParams, {
              isIncludeSubItems: params.isIncludeSubItems,
              isExpand: true,
              isIgnoreParentInactive: params.isIgnoreParentInactive
            });
            return Array.isArray(result) ? result : [];
          })
        )
      ).flat();
    } else {
      this.setResourceStore(this.resource);
      data = await this.resourceStore?.selectMany(selectParams, {
        isIncludeSubItems: params.isIncludeSubItems,
        isIgnoreParentInactive: params.isIgnoreParentInactive,
        isExpand: true
      });
    }
    if (isValidArray(data)) {
      if (isValidString(params.searchQuery)) {
        if (!this.dev_isUseIndexSearch)
          data = highlightSearchQuery(data, params.searchQuery!);
        data = data.sort(searchSort);
      }
      return data;
    } else {
      toasts.error("Something went wrong. Please try again later.");
      return [];
    }
  }

  starred() {
    return flux.selectMany(this.resource, {
      filters: {
        ...activeResourceFilterV2,
        isStarred: true
      },
      orderBy: {
        modifiedAt: "desc"
      }
    });
  }

  /**
   *
   * TODO - test parent and mdParent
   * @param query
   * @returns
   */
  async searchForLinking(
    query: string,
    params?: {
      resource?: Resource;
      subType?: NodeType | CollectionType;
      exclude?: IRecordId[];
    }
  ) {
    logger.log({ at: "searchForLinking", query, params });
    if (!isValidString(query)) {
      let items = [];
      if (params?.resource) {
        items = recentsStore.resolve({
          type: params?.resource,
          exclude: params?.exclude
        });
      } else {
        const recentNodes = recentsStore.resolve({
          type: Resource.node,
          exclude: params?.exclude
        });
        const recentCollections = recentsStore.resolve({
          type: Resource.collection,
          exclude: params?.exclude
        });
        items = [...recentNodes, ...recentCollections];
      }
      if (params?.subType && params.resource === Resource.node) {
        items = items.filter((x) => x.contentType === params.subType);
      } else if (params?.subType && params.resource === Resource.collection) {
        items = items.filter((x) => x.type === params.subType);
      }
      if (
        params?.resource === Resource.collection &&
        this.collectibleResource
      ) {
        items = items.filter((x) =>
          this.collectibleResource?.includes(x.resource)
        );
      }
      return items;
    }
    let nodes = [];
    if (params?.resource === Resource.node || !params?.resource) {
      nodes = await flux.selectMany(Resource.node, {
        properties: ["*", "parent.* as parent", labelSearchProp],
        filters: {
          contentType: params?.subType
            ? [params.subType]
            : [...rootNodeTypeList, ...headingNodeTypes],
          ...activeResourceFilterV2
        },
        search: isValidString(query)
          ? {
              properties: ["label", "text"],
              query
            }
          : undefined,
        limit: isValidString(query) ? 200 : 50,
        orderBy: !isValidString(query)
          ? {
              modifiedAt: "desc"
            }
          : undefined
      });
    }
    let collections = [];
    if (params?.resource === Resource.collection || !params?.resource) {
      collections = await flux.selectMany(Resource.collection, {
        filters: {
          ...activeResourceFilterV2,
          ...(this.collectibleResource
            ? {
                resource: this.collectibleResource
              }
            : {})
        },
        search: isValidString(query)
          ? {
              properties: ["label"],
              query
            }
          : undefined
      });
    }
    let data = [...(nodes ?? []), ...(collections ?? [])];
    if (isValidString(query) && isValidArray(data)) {
      if (!this.dev_isUseIndexSearch) data = highlightSearchQuery(data, query);
      data = data.sort(searchSort);
    }
    if (params?.exclude) {
      data = data.filter((x) => !params.exclude.some(resourceInList(x.id)));
    }
    return data;
  }

  async searchForLinkingOnExtension(query: string, resource?: Resource) {
    let nodes = [];
    if (resource === Resource.node || !resource) {
      nodes = await extensionFlux({
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: Resource.node,
          params: {
            filters: {
              contentType: [...rootNodeTypeList, ...headingNodeTypes]
            },
            search: isValidString(query)
              ? {
                  properties: ["body", "label"],
                  query
                }
              : undefined
          }
        }
      });
    }
    let collections = [];
    if (resource === Resource.collection || !resource) {
      collections = await extensionFlux({
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: Resource.collection,
          params: {
            search: isValidString(query)
              ? {
                  properties: ["label"],
                  query
                }
              : undefined
          }
        }
      });
    }
    return [...(nodes ?? []), ...(collections ?? [])].filter(activeResourceFilter)
  }

  async resolveCount(
    resource: Resource,
    subType?: NodeType | CollectionType,
    additionalFilters?: any
  ) {
    try {
      logger.log({
        at: "resolveCount",
        resource,
        subType,
        additionalFilters
      });
      this.resource = resource;
      if (resource === Resource.node) {
        const result = await flux.selectMany(resource, {
          properties: ["count()"],
          filters: {
            ...activeResourceFilterV2,
            ...additionalFilters,
            isArchived: additionalFilters?.isArchived ?? false,
            contentType: subType ? [subType] : [...rootNodeTypeList],
            metaType: false,
            creationContext: subType ? undefined : false
          },
          groupBy: ["all"]
        });
        return result?.[0]?.count;
      } else if (
        resource === Resource.collection ||
        resource === Resource.combination ||
        resource === Resource.goal ||
        resource === Resource.task ||
        resource === Resource.relation
      ) {
        if (resource === Resource.relation) resource = Resource.linkTag;
        this.setResourceStore(this.resource);
        const selectParams = {
          properties: ["count()"],
          filters: {
            ...activeResourceFilterV2,
            ...(additionalFilters ?? {}),
            ...(resource === Resource.collection && this.collectibleResource
              ? {
                  resource: this.collectibleResource
                }
              : {}),
            isArchived: additionalFilters?.isArchived ?? false,
            type:
              subType && resource === Resource.goal
                ? subType
                : subType
                  ? [subType]
                  : undefined
          },
          groupBy: ["all"]
        };
        const result = await this.resourceStore?.selectMany(selectParams);
        // const resultOld = await flux.selectMany(resource, selectParams);
        return result?.[0]?.count;
      }
    } catch (e) {
      logger.error({ at: "resolveCount", error: e });
      return 0;
    }
  }

  resolveSubTypeCounts(resource: Resource, additionalFilters?: any) {
    try {
      if (resource === Resource.node) {
        return flux.selectMany(resource, {
          properties: ["count()", "contentType as type"],
          filters: {
            ...activeResourceFilterV2,
            ...additionalFilters
          },
          groupBy: ["type"]
        });
      } else if (
        resource === Resource.collection ||
        resource === Resource.combination ||
        resource === Resource.task
      ) {
        return flux.selectMany(resource, {
          properties: ["count()", "type"],
          filters: { ...activeResourceFilterV2, ...additionalFilters },
          groupBy: ["type"]
        });
      }
    } catch (e) {
      logger.error({ at: "resolveSubTypeCounts", error: e });
      return [];
    }
  }
}

export class BulkEditor {
  resource: Resource = Resource.node;
  multiSelectStore: MultiSelectStore;
  constructor(
    resource: Resource = Resource.node,
    multiSelectStore: MultiSelectStore
  ) {
    this.resource = resource;
    this.multiSelectStore = multiSelectStore;
  }

  async run(action: string) {
    let isResetItems = false;
    try {
      if (this.resource === Resource.everything) return;
      const items = this.multiSelectStore.get();
      const accessPointId = this.multiSelectStore.context.accessPointId;
      const accessPoint = this.multiSelectStore.context.accessPoint;
      logger.debug({
        at: "BulkEditor.run",
        action,
        items,
        accessPointId,
        accessPoint
      });
      const additionalParams = {
        context: accessPoint
      };
      if (this.resource === Resource.node) {
        switch (action) {
          case "unlink":
            if (!accessPointId) {
              toasts.error("Something went wrong. Please try again later.");
              return;
            }
            const result = await linker.bulkUnlinkForDirect(
              items,
              accessPointId
            );
            logger.debug({ at: "BulkEditor.run unlink", result });
            onSuccess(action, items.length, Resource.node);
            break;
          case "link":
            appStore.runAction(Action.BULK_LINK, {
              componentParams: {
                label: "Link to a node",
                resource: Resource.node,
                multiSelectStore: this.multiSelectStore
              }
            });
            break;
          case "linkbox":
            appStore.runAction(Action.BULK_LINK, {
              componentParams: {
                label: "Link to a node or add to a collection",
                multiSelectStore: this.multiSelectStore
              }
            });
            break;
          case "collect":
            appStore.runAction(Action.BULK_LINK, {
              componentParams: {
                label: "Add to collection",
                resource: Resource.collection,
                multiSelectStore: this.multiSelectStore
              }
            });
            break;
          case "star":
            await nodeStore.bulkModify(
              items,
              {
                isStarred: true
              },
              additionalParams
            );
            onSuccess(action, items.length, Resource.node);
            break;
          case "unstar":
            await nodeStore.bulkModify(
              items,
              {
                isStarred: false
              },
              additionalParams
            );
            onSuccess(action, items.length, Resource.node);
            break;
          case "archive":
            await nodeStore.bulkModify(
              items,
              {
                isArchived: true
              },
              additionalParams
            );
            onSuccess(action, items.length, Resource.node);
            break;
          case "unarchive":
            await nodeStore.bulkModify(
              items,
              {
                isArchived: false
              },
              additionalParams
            );
            onSuccess(action, items.length, Resource.node);
            break;
          case "delete":
            await nodeStore.bulkTrash(items, additionalParams);
            onSuccess(action, items.length, Resource.node);
            break;
        }
      } else if (this.resource === Resource.collection) {
        switch (action) {
          case "star":
            await collectionStore.bulkModify(
              items,
              {
                isStarred: true
              },
              additionalParams
            );
            onSuccess(action, items.length, Resource.collection);
            break;
          case "unstar":
            await collectionStore.bulkModify(
              items,
              {
                isStarred: false
              },
              additionalParams
            );
            onSuccess(action, items.length, Resource.collection);
            break;
          case "archive":
            await collectionStore.bulkModify(
              items,
              {
                isArchived: true
              },
              additionalParams
            );
            onSuccess(action, items.length, Resource.collection);
            break;
          case "unarchive":
            await collectionStore.bulkModify(
              items,
              {
                isArchived: false
              },
              additionalParams
            );
            onSuccess(action, items.length, Resource.collection);
            break;
          case "delete":
            await collectionStore.bulkTrash(items, additionalParams);
            onSuccess(action, items.length, Resource.collection);
            break;
        }
      } else if (this.resource === Resource.goal) {
        switch (action) {
          case "star":
            await goalStore.bulkModify(
              items,
              {
                isStarred: true
              },
              additionalParams
            );
            onSuccess(action, items.length, this.resource);
            break;
          case "unstar":
            await goalStore.bulkModify(
              items,
              {
                isStarred: false
              },
              additionalParams
            );
            onSuccess(action, items.length, this.resource);
            break;
          case "archive":
            await goalStore.bulkModify(
              items,
              {
                isArchived: true
              },
              additionalParams
            );
            onSuccess(action, items.length, this.resource);
            break;
          case "unarchive":
            await goalStore.bulkModify(
              items,
              {
                isArchived: false
              },
              additionalParams
            );
            onSuccess(action, items.length, this.resource);
            break;
          case "delete":
            await goalStore.bulkTrash(items, additionalParams);
            onSuccess(action, items.length, this.resource);
            break;
        }
      } else if (this.resource === Resource.task) {
        switch (action) {
          case "complete":
            await taskStore.bulkModify(
              items,
              {
                isChecked: true,
                completedAtUnix: resolveUnixTimestamp()
              },
              additionalParams
            );
            onSuccess(action, items.length, this.resource);
            break;
          case "delete":
            await goalStore.bulkTrash(items, additionalParams);
            onSuccess(action, items.length, this.resource);
            break;
        }
      }
      if (isResetItems) {
        this.multiSelectStore.reset();
        return true;
      }
    } catch (e) {
      toasts.error("Failed to perform bulk action");
      return false;
    }

    function onSuccess(action: string, count: number, resource: Resource) {
      toasts.success(resolveMessage(action, count, resource));
      isResetItems = true;
    }

    function resolveMessage(action: string, count: number, resource: Resource) {
      let prefix = "";
      switch (action) {
        case "star":
          prefix = "Starred";
          break;
        case "unstar":
          prefix = "Unstarred";
          break;
        case "archive":
          prefix = "Archived";
          break;
        case "unarchive":
          prefix = "Unarchived";
          break;
        case "delete":
          prefix = "Deleted";
          break;
        case "unlink":
          prefix = "Unlinked";
          break;
      }
      return `${prefix} ${count} ${resource}${count > 1 ? "s" : ""} successfully`;
    }
  }
}
