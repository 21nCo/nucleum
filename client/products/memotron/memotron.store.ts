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
import type { CollectionType } from "./collection/collection.type";

export const MAX_FILE_SIZE_MB = 30;

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
   * @returns
   */
  async nodes() {
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
                //TODO - this is causing extreme slowness for select query if there are 1000s of records on the table
                // "(fn::memotron::node::parent($parent.id)) as mdParent"
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
      }
    );

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
    }
    if (isValidArray(data)) {
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
    params?: { resource?: Resource; subType?: NodeType | CollectionType }
  ) {
    let nodes = [];
    if (params?.resource === Resource.node || !params?.resource) {
      nodes = await flux.selectMany(Resource.node, {
        properties: [
          "*",
          "parent.* as parent",
          labelSearchProp
          //TODO - disabling temp - to reduce query time
          // "(fn::memotron::node::parent($parent.id)) as mdParent"
        ],
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
        limit: isValidString(query) ? 200 : 50
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
    return [...(nodes ?? []), ...(collections ?? [])];
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

  private async recentNodes() {
    const result = await flux.selectMany(Resource.node, {
      properties: ["*", "parent.* as parent"],
      filters: {
        contentType: rootNodeTypeList.concat(headingNodeTypes),
        ...activeResourceFilterV2,
        creationContext: false
      },
      orderBy: this.orderBy ?? {
        modifiedAt: "desc"
      },
      limit: this.limit,
      offset: this.offset
    });
    logger.log({ at: "recentNodes", result });
    return result;
  }
  private async recentCollections() {
    const result = await flux.selectMany(Resource.collection, {
      filters: {
        ...activeResourceFilterV2
      },
      orderBy: this.orderBy ?? {
        modifiedAt: "desc"
      },
      limit: this.limit,
      offset: this.offset
    });
    logger.log({ at: "recentCollections", result });
    return result;
  }

  async recents(
    resource?: Resource,
    params?: { limit?: number; offset?: number }
  ) {
    this.resource = resource ?? this.resource;
    this.limit = params?.limit ?? this.limit;
    this.offset = params?.offset ?? this.offset;
    let data: any[] = [];
    if (this.resource === Resource.everything) {
      const nodes = await this.recentNodes();
      const collections = await this.recentCollections();
      data = [...nodes, ...(collections ?? [])];
    } else if (this.resource === Resource.node) {
      data = await this.recentNodes();
    } else if (this.resource === Resource.collection) {
      data = (await this.recentCollections()) ?? [];
    }
    return data;
  }

  async resolveCount(resource: Resource, subType?: NodeType | CollectionType) {
    if (resource === Resource.node) {
      const result = await flux.selectMany(resource, {
        properties: ["count()"],
        filters: {
          contentType: subType ? [subType] : [...rootNodeTypeList],
          creationContext: false,
          ...activeResourceFilterV2
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
          type: subType ? [subType] : undefined,
          ...activeResourceFilterV2
        },
        groupBy: ["all"]
      });
      return result?.[0]?.count;
    }
  }
}
