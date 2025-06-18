import {
  headingNodeTypes,
  NodeType,
  rootNodeTypeList
} from "$lib/client/products/memotron/node/node.type";
import {
  activeResourceFilter,
  activeResourceFilterV2
} from "$lib/client/utils/utils";
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
import {
  isValidArray,
  isValidArrayWithData
} from "$lib/shared/utils/obj.utils";
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
import {
  determineResourceType,
  isSameResource,
  removeDuplicatesFilter,
  resolveProductResources,
  resourceInList
} from "$lib/client/components/flux/resourceStores/resource.utils";
import { recentsStore } from "./recent.store";
import { get } from "svelte/store";
import { resolveCollectionResource } from "../collection/collection.utils";
import { goalStore } from "../goals/goal.store";
import { Action } from "$lib/client/types/action.enum";
import { taskStore } from "../tasks/task.store";
import { resolveUnixTimestamp } from "$lib/shared/utils/time.utils";
import { resolveResourceStore } from "../flux/resourceStores/store.resolver";
import { clientStorage } from "$lib/client/persistence/persistence.utils";
import { ClientStorageKey } from "$lib/client/persistence/persistence.type";

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
  searcheableResources: Resource[] | undefined;
  resourceStore: ResourceStore<any> | undefined;
  /**
   * Test run for pre filtering by loading all records first into memory - then querying only the filtered records for expansion like joins.
   */
  isPreFilterBeforeExpand: boolean = false;
  constructor(resource: Resource = Resource.everything) {
    this.resource = resource;
    const product = get(appStore).product;
    this.searcheableResources = resolveProductResources(product);
    this.collectibleResource = resolveCollectionResource(product);
    if (resource !== Resource.everything) {
      this.setResourceStore(resource);
    }
  }

  setResourceStore(resource: Resource) {
    this.resourceStore = resolveResourceStore(resource);
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
    isExpand?: boolean;
    properties?: string[];
    isIncludeMetaItems?: boolean;
    signal?: AbortSignal;
  }) {
    this.resource = params.resource ?? this.resource;
    logger.log({
      at: "SearchStore.refresh",
      params
    });

    // Check if operation was aborted before starting
    if (params.signal?.aborted) {
      throw new Error("Operation aborted");
    }

    let data: any;
    const selectParams = {
      properties: params.properties ?? [labelSearchProp, "modifiedAt"],
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
      semanticSearchTopK: params.semanticSearchTopK,
      signal: params.signal
    };
    if (this.resource === Resource.everything && this.searcheableResources) {
      data = (
        await Promise.all(
          this.searcheableResources.map(async (resource) => {
            // Check if operation was aborted before each resource
            if (params.signal?.aborted) {
              throw new Error("Operation aborted");
            }

            if (isValidString(params.searchQuery)) {
              selectParams.search = {
                query: params.searchQuery!,
                properties: resolveSearchProperties(resource)
              };
            }
            this.setResourceStore(resource);
            const result = await this.resourceStore?.selectMany(selectParams, {
              isIncludeSubItems: params.isIncludeSubItems,
              isExpand: params.isExpand ?? true,
              isIgnoreParentInactive: params.isIgnoreParentInactive,
              isIncludeMetaItems: params.isIncludeMetaItems,
              signal: params.signal
            });
            return Array.isArray(result) ? result : [];
          })
        )
      ).flat();
    } else {
      this.setResourceStore(this.resource);
      if (this.isPreFilterBeforeExpand && this.resource === Resource.node) {
        // Check if operation was aborted before first query
        if (params.signal?.aborted) {
          throw new Error("Operation aborted");
        }

        const allRecords = await this.resourceStore?.selectMany(
          {
            properties: [
              "id",
              "isArchived",
              "trashInformation",
              "contentType",
              "isStarred"
            ]
          },
          {
            isQueryAsIs: true,
            signal: params.signal
          }
        );

        // Check if operation was aborted after first query
        if (params.signal?.aborted) {
          throw new Error("Operation aborted");
        }

        const activeRecords = allRecords
          .filter((x: any) => rootNodeTypeList.includes(x.contentType))
          .filter((x: any) =>
            params.filters?.isStarred ? x.isStarred === true : true
          )
          .filter((x: any) => {
            if (params.filters?.isArchived) {
              return x.isArchived === true;
            }
            return true;
          })
          .slice(params.offset ?? 0, params.offset + (params.limit ?? 50));
        data = await this.resourceStore?.selectMany(
          {
            filters: {
              id: activeRecords.map((x) => x.id?.toString())
            }
          },
          {
            isQueryAsIs: true,
            isExpand: true,
            signal: params.signal
          }
        );
      } else {
        data = await this.resourceStore?.selectMany(selectParams, {
          isIncludeSubItems: params.isIncludeSubItems,
          isIgnoreParentInactive: params.isIgnoreParentInactive,
          isExpand: params.isExpand ?? true,
          isIncludeMetaItems: params.isIncludeMetaItems,
          signal: params.signal
        });
      }
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
    console.time("searchForLinking");
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
        limit: isValidString(query) ? 100 : 50,
        orderBy: !isValidString(query)
          ? {
              modifiedAt: "desc"
            }
          : undefined
      });
      if (nodes && isValidArrayWithData(nodes)) {
        try {
          const parentIds = nodes.map((x) => x.mdParent ?? [])?.flat();
          const parentItems = await nodeStore.selectMany({
            properties: ["label", "id", "body"],
            filters: {
              contentType: [...headingNodeTypes, NodeType.NODULAR_MARKDOWN],
              id: parentIds?.map((x) => x.toString())
            }
          });
          nodes = nodes.map((x) => {
            if (!x.mdParent) return x;
            const parent = x.mdParent.map((y) => {
              const parentItem = parentItems.find(resourceInList(y));
              return parentItem;
            });
            return {
              ...x,
              mdParent: parent
            };
          });
        } catch (e) {
          logger.error({ at: "searchForLinking - parentItems", error: e });
        }
      }
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
    console.timeEnd("searchForLinking");
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
              : undefined,
            limit: 100
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
              : undefined,
            limit: 100
          }
        }
      });
    }
    let recentItemsArray = [];
    if (!isValidString(query)) {
      try {
        const recentItems = await clientStorage.get(ClientStorageKey.RECENTS);
        recentItemsArray = recentItems ? JSON.parse(recentItems) : [];
        if (recentItemsArray.length > 0 && resource) {
          recentItemsArray = recentItemsArray.filter(
            (x: any) => {
              const itemResourceType = determineResourceType(x.id);
              return itemResourceType === resource;
            }
          );
        }
      } catch (e) {
        logger.error({ at: "searchForLinkingOnExtension - recentItems", error: e });
      }
    }
    return [
      ...recentItemsArray,
      ...(nodes ?? []),
      ...(collections ?? [])
    ].filter(activeResourceFilter).filter(removeDuplicatesFilter)
  }

  async resolveCount(params?: {
    resource?: Resource;
    subType?: NodeType | CollectionType;
    filters?: IResourceSelectFilters;
    signal?: AbortSignal;
  }) {
    try {
      // Check if operation was aborted before starting
      if (params?.signal?.aborted) {
        throw new Error("Operation aborted");
      }

      logger.log({
        at: "resolveCount",
        params
      });
      let resource = params?.resource ?? this.resource;
      if (resource === Resource.node) {
        const result = await flux.selectMany(
          resource,
          {
            properties: ["count()"],
            filters: {
              ...activeResourceFilterV2,
              ...(params?.filters ?? {}),
              isArchived: params?.filters?.isArchived ?? false,
              contentType: params?.subType
                ? [params.subType]
                : [...rootNodeTypeList],
              metaType: false,
              creationContext: params?.subType ? undefined : false
            },
            groupBy: ["all"]
          },
          {
            signal: params?.signal
          }
        );
        return result?.[0]?.count;
      } else if (
        resource === Resource.collection ||
        resource === Resource.combination ||
        resource === Resource.goal ||
        resource === Resource.task ||
        resource === Resource.relation
      ) {
        if (resource === Resource.relation) resource = Resource.linkTag;
        this.setResourceStore(resource);
        const selectParams = {
          properties: ["count()"],
          filters: {
            ...activeResourceFilterV2,
            ...(params?.filters ?? {}),
            ...(resource === Resource.collection && this.collectibleResource
              ? {
                  resource: this.collectibleResource
                }
              : {}),
            isArchived: params?.filters?.isArchived ?? false,
            type:
              params?.subType && resource === Resource.goal
                ? params.subType
                : params?.subType
                  ? [params.subType]
                  : undefined
          },
          groupBy: ["all"]
        };
        const result = await this.resourceStore?.selectMany(selectParams, {
          signal: params?.signal
        });
        console.log({
          at: "SearchStore.resolveCount",
          resource,
          result,
          resourceStore: this.resourceStore
        });
        // const resultOld = await flux.selectMany(resource, selectParams);
        return result?.[0]?.count;
      }
    } catch (e) {
      if (e instanceof Error && e.message === "Operation aborted") {
        logger.log({ at: "resolveCount - aborted", e });
        throw e;
      }
      logger.error({ at: "resolveCount", error: e });
      return 0;
    }
  }

  resolveSubTypeCounts(
    resource: Resource,
    additionalFilters?: any,
    signal?: AbortSignal
  ) {
    try {
      if (resource === Resource.node) {
        return flux.selectMany(
          resource,
          {
            properties: ["count()", "contentType as type"],
            filters: {
              ...activeResourceFilterV2,
              ...additionalFilters
            },
            groupBy: ["type"]
          },
          {
            signal
          }
        );
      } else if (
        resource === Resource.collection ||
        resource === Resource.combination ||
        resource === Resource.task
      ) {
        return flux.selectMany(
          resource,
          {
            properties: ["count()", "type"],
            filters: { ...activeResourceFilterV2, ...additionalFilters },
            groupBy: ["type"]
          },
          {
            signal
          }
        );
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

  async bulkUnlink(items: IRecordId[], accessPointId: IRecordId) {
    const result = await linker.bulkUnlinkForDirect(items, accessPointId);
    const resourceType = determineResourceType(items[0]);
    const resourceStore = resolveResourceStore(resourceType);
    if (resourceStore) {
      const expandedItems = await resourceStore.selectMany({
        filters: {
          id: items.map((x) => x.toString())
        }
      });
      const promises = expandedItems.map((i: any) => {
        resourceStore.modify(i.id, {
          collections: i.collections?.filter(
            (x: IRecordId) => !isSameResource(x, accessPointId)
          )
        });
      });
      await Promise.all(promises);
    }
    return result;
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
            const result = await this.bulkUnlink(items, accessPointId);
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
