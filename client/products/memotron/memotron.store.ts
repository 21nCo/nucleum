// import { dataManager } from "$lib/client/persistence/dataManager";
import {
  headingNodeTypes,
  LinkType,
  NodeType,
  rootNodeTypeList
} from "$lib/client/products/memotron/node/node.type";
import { activeResourceFilterV2 } from "$lib/client/utils/utils";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { isValidString } from "$lib/shared/utils/text.utils";
import { CollectionType } from "./collection/collection.type";
import {
  type IRecordId,
  type IResourceSelectOrderBy,
  type IStore,
  PersistenceActionType,
  StoreDataType
} from "$lib/client/types/data.type";
import { flux } from "$lib/client/persistence/dataManagerv2";
import { logger } from "$lib/client/components/debug/logger.client";
import { isValidArray } from "$lib/shared/utils/obj.utils";
import { toasts } from "$lib/client/stores/notification.store";
import { replaceParams } from "$lib/client/utils/surreal.utils";

export function resolveResource(id: string) {
  return flux.select(id);
}

export class SearchStore {
  resource: Resource = Resource.everything;
  contentType: CollectionType | NodeType | undefined = undefined;
  searchQuery: string = "";
  isStarFilterSelected: boolean = false;
  limit: number | undefined = undefined;
  offset: number | undefined = undefined;
  orderBy: IResourceSelectOrderBy | undefined = undefined;

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
    const result = await flux.selectMany(Resource.node, {
      properties: [
        "*",
        "parent.* as parent",
        "search::highlight('**', '**', 1, false) AS bodySearch",
        "search::highlight('**', '**', 2, false) AS labelSearch",
        "(fn::memotron::node::parent($parent.id)) as mdParent"
      ],
      filters: {
        contentType:
          this.contentType ?? (this.searchQuery ? undefined : rootNodeTypeList),
        isArchived: this.resource === Resource.archived,
        trashInformation: false,
        isStarred: this.isStarFilterSelected ? true : undefined,
        creationContext: isValidString(this.searchQuery) ? undefined : false
      },
      search: isValidString(this.searchQuery)
        ? {
            query: this.searchQuery,
            properties: ["body", "label"]
          }
        : undefined,
      orderBy: this.orderBy ?? {
        createdAt: "desc"
      },
      limit: this.limit,
      offset: this.offset
    });

    logger.debug({ at: "refreshNodes", result });

    // const result2 = await flux.selectByQuery("select * from node;");
    // logger.debug({ at: "all nodes: ", result2 });
    return result;
  }

  async collections() {
    const result = await flux.selectMany(Resource.collection, {
      properties: [
        "search::highlight('**', '**', 1, false) AS labelSearch",
        "*"
      ],
      filters: {
        isArchived: this.resource === Resource.archived,
        trashInformation: false,
        isStarred: this.isStarFilterSelected ? true : undefined,
        type: this.contentType ?? undefined
      },
      search: isValidString(this.searchQuery)
        ? {
            query: this.searchQuery,
            properties: ["label"]
          }
        : undefined,
      orderBy: this.orderBy ?? {
        createdAt: "desc"
      },
      limit: this.limit,
      offset: this.offset
    });
    logger.debug({ at: "refreshCollections", result });
    return result;
  }

  async select(params: {
    resource?: Resource;
    searchQuery?: string;
    isStarFilterSelected?: boolean;
    limit?: number;
    offset?: number;
    orderBy?: IResourceSelectOrderBy;
  }) {
    this.resource = params.resource ?? this.resource;
    this.searchQuery = params.searchQuery ?? this.searchQuery;
    this.limit = params.limit ?? this.limit;
    this.offset = params.offset ?? this.offset;
    this.orderBy = params.orderBy ?? this.orderBy;
    this.isStarFilterSelected =
      params.isStarFilterSelected != undefined
        ? params.isStarFilterSelected
        : this.isStarFilterSelected;
    // let data: any[] = [];
    logger.debug({
      at: "SearchStore.refresh",
      ...this
    });
    let data: any;
    if (
      this.resource === Resource.everything ||
      this.resource === Resource.archived
    ) {
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
  async searchForLinking(query: string) {
    const nodes = await flux.selectMany(Resource.node, {
      properties: [
        "*",
        "parent.* as parent",
        "(fn::memotron::node::parent($parent.id)) as mdParent"
      ],
      filters: {
        contentType: [...rootNodeTypeList, ...headingNodeTypes],
        ...activeResourceFilterV2
      },
      search: {
        properties: ["body", "label"],
        query
      }
    });
    const collections = await flux.selectMany(Resource.collection, {
      filters: {
        ...activeResourceFilterV2
      },
      search: {
        properties: ["label"],
        query
      }
    });
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
    logger.debug({ at: "recentNodes", result });
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
    logger.debug({ at: "recentCollections", result });
    return result;
  }

  async recents(resource: Resource) {
    this.resource = resource ?? this.resource;
    let data: any[] = [];
    if (
      this.resource === Resource.everything ||
      this.resource === Resource.archived
    ) {
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
}

class Linker implements IStore {
  id: string = "linker";
  dataType: StoreDataType = StoreDataType.NA;

  async link(
    from: IRecordId,
    to: IRecordId,
    linkType: LinkType = LinkType.DIRECT
  ) {
    const response = await flux.mutation(Resource.link, {
      action: PersistenceActionType.CUSTOM,
      query: this.generateLinkQuery(from, to, linkType)
    });
    logger.debug({ at: "link", response });
    return response;
  }

  async unlink(from: IRecordId, to: IRecordId) {
    let response = await flux.mutation(Resource.link, {
      action: PersistenceActionType.CUSTOM,
      query:
        "DELETE $from->link where out=$to; DELETE $to->link where out=$from;",
      data: {
        from,
        to
      }
    });
    logger.debug({ at: "unlink", response });
    return response;
  }

  async linkMany(links: any[]) {
    const query = links
      .map((link) => this.generateLinkQuery(link.from, link.to, link.linkType))
      .join("; ");
    let response = await flux.mutation(Resource.link, {
      action: PersistenceActionType.CUSTOM,
      query
    });
    logger.debug({ at: "linkMany", response });
    return response;
  }

  private generateLinkQuery(from: IRecordId, to: IRecordId, linkType: string) {
    return replaceParams(
      `relate $from->link->$to content {toType: meta::tb($to), linkType: $linkType, createdAt: time::now()}`,
      {
        from,
        to,
        linkType
      }
    );
  }

  get() {}
}

export const linker = new Linker();
