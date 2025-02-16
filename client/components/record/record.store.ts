import {
  headingNodeTypes,
  NodeType,
  rootNodeTypeList
} from "$lib/client/products/memotron/node/node.type";
import { activeResourceFilterV2 } from "$lib/client/utils/utils";
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
import type { MultiSelectStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { appStore } from "$lib/client/stores/app.store";
import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import {
  highlightSearchQuery,
  searchSort
} from "$lib/client/products/memotron/memotron.utils";
import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
import { recentsStore } from "./recent.store";

export const MAX_FILE_SIZE_MB = 100;

export function resolveResource(id: IRecordId) {
  return flux.select(id);
}

const labelSearchProp =
  "search::highlight('**', '**', 1, false) AS labelSearch";

export class SearchStore {
  resource: Resource = Resource.everything;
  searchQuery: string = "";
  limit: number | undefined = undefined;
  offset: number | undefined = undefined;
  orderBy: IResourceSelectOrderBy | undefined = undefined;
  filters: IResourceSelectFilters = {};
  searchType: SearchType = SearchType.FULL_TEXT;
  semanticSearchTopK: number | undefined;
  dev_isUseIndexSearch: boolean = false;
  constructor(resource: Resource = Resource.everything) {
    this.resource = resource;
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
   * TODO - group by mdParent if searching
   *
   *
   * this is causing extreme slowness for select query if there are 1000s of records on the table if used in select query prop
   * "(fn::memotron::node::parent($parent.id)) as mdParent"
   *
   * @returns
   */
  async nodes() {
    console.log("record.store.ts - nodes");
    const result = await flux.selectMany(
      this.searchType == SearchType.SEMANTIC && this.searchQuery
        ? Resource.vector
        : Resource.node,
      {
        semanticSearchTopK: this.semanticSearchTopK,
        searchType: this.searchType,
        properties:
          this.searchType === SearchType.SEMANTIC && this.searchQuery
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
          this.searchType == SearchType.SEMANTIC && this.searchQuery
            ? {}
            : {
                trashInformation: false,
                creationContext:
                  isValidString(this.searchQuery) || this.filters.contentType
                    ? undefined
                    : false,
                ...this.filters,
                isArchived: this.filters.isArchived ?? false,
                contentType:
                  "contentType" in this.filters
                    ? this.filters.contentType?.toUpperCase()
                    : this.searchQuery
                      ? undefined
                      : rootNodeTypeList
              },
        search: isValidString(this.searchQuery)
          ? {
              query: this.searchQuery,
              properties: ["label", "text"]
            }
          : undefined,
        orderBy: this.orderBy ?? {
          modifiedAt: "desc"
        },
        limit: this.limit,
        offset: this.offset
      },
      {
        isCloudOnlyResource:
          this.searchType === SearchType.SEMANTIC &&
          isValidString(this.searchQuery)
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

  async collections() {
    const result = await flux.selectMany(Resource.collection, {
      properties: [labelSearchProp, "*", "typeToExtend.* as typeToExtend"],
      filters: {
        trashInformation: false,
        ...this.filters,
        isArchived: this.filters.isArchived ?? false,
        type:
          "type" in this.filters && this.filters.type
            ? this.filters.type?.toUpperCase()
            : undefined
      },
      search: isValidString(this.searchQuery)
        ? {
            query: this.searchQuery,
            properties: ["label"]
          }
        : undefined,
      orderBy: this.orderBy ?? {
        modifiedAt: "desc"
      },
      limit: this.limit,
      offset: this.offset
    });
    logger.log({ at: "refreshCollections", result });
    return result;
  }

  async tasks() {
    const result = await flux.selectMany(Resource.task, {
      properties: [labelSearchProp, "*"],
      filters: {
        trashInformation: false,
        ...this.filters,
        isArchived: this.filters.isArchived ?? false,
        type:
          "type" in this.filters && this.filters.type
            ? this.filters.type?.toUpperCase()
            : undefined,
        parent: this.searchQuery ? undefined : false
      },
      search: isValidString(this.searchQuery)
        ? {
            query: this.searchQuery,
            properties: ["label"]
          }
        : undefined,
      orderBy: this.orderBy ?? {
        modifiedAt: "desc"
      },
      limit: this.limit,
      offset: this.offset
    });
    logger.log({ at: "refreshCollections", result });
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
  }) {
    this.resource = params.resource ?? this.resource;
    this.searchQuery = params.searchQuery ?? this.searchQuery;
    this.limit = params.limit ?? this.limit;
    this.offset = params.offset ?? this.offset;
    this.orderBy = params.orderBy ?? this.orderBy;
    this.filters = params.filters ?? this.filters;
    this.searchType = params.searchType ?? this.searchType;
    this.semanticSearchTopK =
      params.semanticSearchTopK ?? this.semanticSearchTopK;
    logger.log({
      at: "SearchStore.refresh",
      ...this
    });
    let data: any;
    if (this.resource === Resource.everything) {
      const nodes = await this.nodes();
      const collections = await this.collections();
      data = [...(nodes ?? []), ...(collections ?? [])];
    } else if (this.resource === Resource.node) {
      data = (await this.nodes()) ?? [];
    } else if (this.resource === Resource.collection) {
      data = (await this.collections()) ?? [];
    } else if (this.resource === Resource.task) {
      data = (await this.tasks()) ?? [];
    }
    if (isValidArray(data)) {
      if (isValidString(this.searchQuery)) {
        if (!this.dev_isUseIndexSearch)
          data = highlightSearchQuery(data, this.searchQuery);
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
      orderBy: this.orderBy ?? {
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
      let items = recentsStore.resolve({
        type: params?.resource,
        exclude: params?.exclude
      });
      if (params?.subType && params.resource === Resource.node) {
        items = items.filter((x) => x.contentType === params.subType);
      } else if (params?.subType && params.resource === Resource.collection) {
        items = items.filter((x) => x.type === params.subType);
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
          ...activeResourceFilterV2
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
    return [...(nodes ?? []), ...(collections ?? [])];
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
      if (resource === Resource.node) {
        const result = await flux.selectMany(resource, {
          properties: ["count()"],
          filters: {
            ...activeResourceFilterV2,
            ...additionalFilters,
            isArchived: this.filters.isArchived ?? false,
            contentType: subType ? [subType] : [...rootNodeTypeList],
            creationContext: subType ? undefined : false
          },
          groupBy: ["all"]
        });
        return result?.[0]?.count;
      } else if (
        resource === Resource.collection ||
        resource === Resource.combination ||
        resource === Resource.task
      ) {
        const result = await flux.selectMany(resource, {
          properties: ["count()"],
          filters: {
            ...activeResourceFilterV2,
            ...additionalFilters,
            isArchived: this.filters.isArchived ?? false,
            type: subType ? [subType] : undefined,
            parent: resource === Resource.task ? false : undefined
          },
          groupBy: ["all"]
        });
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
            appStore.runAction(MemotronAction.BULK_LINK, {
              componentParams: {
                label: "Link to a node",
                resource: Resource.node,
                multiSelectStore: this.multiSelectStore
              }
            });
            break;
          case "linkbox":
            appStore.runAction(MemotronAction.BULK_LINK, {
              componentParams: {
                label: "Link to a node or add to a collection",
                multiSelectStore: this.multiSelectStore
              }
            });
            break;
          case "collect":
            appStore.runAction(MemotronAction.BULK_LINK, {
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
