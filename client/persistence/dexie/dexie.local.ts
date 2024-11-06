import {
  RemotePersistenceProvider,
  type IPersistence,
  type IPersistenceInitParams
} from "../persistence.type";
import type {
  IMetaResource,
  IResource
} from "$lib/client/components/flux/resourceStores/resource.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  FilterCombinationMethod,
  PersistenceActionType,
  type IMutationParamsv2,
  type IRecordId,
  type IResourceFilter,
  type IResourceFilterGroup,
  type IResourceSelectParams
} from "$lib/client/types/data.type";
import { LocalDexie } from "$local/local";
import type { Collection, Table } from "dexie";
import { logger } from "$lib/client/components/debug/logger.client";

type QueryableType = Table | Collection;

export class DexiePersistence implements IPersistence {
  instance: LocalDexie | undefined = undefined;
  userId: string = "";
  remote: RemotePersistenceProvider;

  constructor(remote: RemotePersistenceProvider) {
    this.remote = remote;
  }

  async initialize(params: IPersistenceInitParams): Promise<number> {
    const user = params.userId ?? params.dapId;
    if (this.userId === user && this.instance) return -1;
    this.instance = new LocalDexie(user);
    this.userId = user;
    const initLog = await this.select("kv:local");
    logger.log({ at: "DexiePersistence.initialize", initLog });
    if (initLog) {
      return 1;
    }
    await this.addInitializationLog(params);
    return 0;
  }

  private async addInitializationLog(params?: IPersistenceInitParams) {
    await this.instance?.table(Resource.kv).add({
      id: "kv:local",
      createdAt: new Date().toISOString(),
      isLocalMode: !params?.userId,
      dapId: params?.dapId
    });
  }

  mutation<T extends IResource | IMetaResource>(
    resource: Resource,
    params: IMutationParamsv2<T>
  ) {
    switch (params.action) {
      case PersistenceActionType.INSERT:
        return this.instance?.table(resource).bulkPut(params.records);
      case PersistenceActionType.REPLACE:
        return this.instance?.table(resource).put(params.record);
      case PersistenceActionType.MERGE:
        return this.merge(resource, params.record.id, params.record);
      case PersistenceActionType.DELETE:
        logger.log({ at: "DexiePersistence.mutation delete", params });
        return this.instance?.table(resource).delete(params.recordId);
      case PersistenceActionType.BULK_MERGE:
        //TODO
        return;
      case PersistenceActionType.CUSTOM:
        //TODO
        return;
    }
  }

  async merge(resource: Resource, id: IRecordId, data: any) {
    try {
      const result = await this.instance?.table(resource).update(id, data);
      logger.log({ at: "DexiePersistence.merge", id, data, result, resource });
      if (result === 0) {
        return this.instance?.table(resource).put({ ...data, id });
      }
      return result;
    } catch (e) {
      logger.error({ at: "DexiePersistence.merge", id, data, e });
    }
  }

  private resolveResource(id: IRecordId | Resource) {
    return typeof id === "string" ? id.split(":")[0] : id?.tb;
  }

  private resolveId(id: IRecordId | Resource) {
    return typeof id === "string" ? id.split(":")[1] : id?.id?.toString();
  }

  /**
   * TODO - delegate to cloud directly as querying is not available on local DB
   * @param query
   * @param params
   * @returns
   */
  query(query: string, params: any): Promise<any> | undefined {
    return this.instance?.table(query).get(params);
  }

  private translateToDexieQuery(
    table: Table | undefined,
    params: IResourceSelectParams | undefined
  ): Collection | undefined {
    try {
      if (!table) return undefined;
      let query: QueryableType = table;

      // Apply indexed filters first
      if (params?.filters && !("condition" in params.filters)) {
        query = this.applyIndexedFilters(
          table,
          params.filters as { [key: string]: any }
        );
      }

      // Apply non-indexed filters and complex filter groups
      if (params?.filters) {
        if ("condition" in params.filters) {
          query = this.applyFilterGroup(
            query,
            params.filters as IResourceFilterGroup
          );
        } else {
          query = this.applyNonIndexedFilters(
            query,
            params.filters as { [key: string]: any }
          );
        }
      }

      // // Convert to Collection if still a Table or WhereClause
      // if (query instanceof Table || query instanceof WhereClause) {
      //   query = query.toCollection();
      // }

      // Apply search
      if (params?.search) {
        query = this.applySearch(query as Collection, params.search);
      }

      // Apply orderBy
      if (params?.orderBy) {
        for (const [key, order] of Object.entries(params.orderBy)) {
          query = (query as Collection).sortBy(key);
          if (order === "desc") {
            query = (query as Collection).reverse();
          }
        }
      }

      // Apply offset and limit
      if (params?.offset !== undefined) {
        query = (query as Collection).offset(params.offset);
      }
      if (params?.limit !== undefined) {
        query = (query as Collection).limit(params.limit);
      }

      return query as Collection;
    } catch (e) {
      logger.error({ at: "DexiePersistence.translateToDexieQuery", e });
    }
  }

  private applyIndexedFilters(
    table: Table,
    filters: { [key: string]: any }
  ): QueryableType {
    let query: QueryableType = table;
    const indexedFilters = Object.entries(filters).filter(([key]) =>
      table.schema.indexes.some((index) => index.name === key)
    );

    if (indexedFilters.length > 0) {
      const [firstKey, firstValue] = indexedFilters[0];
      query = this.applyFilter(table, firstKey, firstValue);

      for (let i = 1; i < indexedFilters.length; i++) {
        const [key, value] = indexedFilters[i];
        query = query.and((item) => this.checkFilter(item, key, value));
      }
    }

    return query;
  }

  private applyFilter(table: Table, key: string, value: any) {
    if (Array.isArray(value)) {
      return table.where(key).anyOf(value);
    } else if (
      typeof value === "object" &&
      value !== null &&
      "from" in value &&
      "to" in value
    ) {
      return table.where(key).between(value.from, value.to);
    } else {
      return table.where(key).equals(value);
    }
  }

  private checkFilter(item: any, key: string, value: any): boolean {
    if (Array.isArray(value)) {
      return value.includes(item[key]);
    } else if (
      typeof value === "object" &&
      value !== null &&
      "from" in value &&
      "to" in value
    ) {
      return item[key] >= value.from && item[key] <= value.to;
    } else {
      return item[key] === value;
    }
  }

  private applyNonIndexedFilters(
    query: QueryableType,
    filters: { [key: string]: any }
  ): Collection {
    return (query as Collection).filter((item) => {
      for (const [key, value] of Object.entries(filters)) {
        if (Array.isArray(value)) {
          if (!value.includes(item[key])) return false;
        } else if (typeof value === "object" && value !== null) {
          // if ("from" in value && "to" in value) {
          //   if (item[key] < value.from || item[key] > value.to) return false;
          // }
          if ("greaterThan" in value) {
            if (item[key] <= value.greaterThan) return false;
          }
          if ("lessThan" in value) {
            if (item[key] >= value.lessThan) return false;
          }
          if ("greaterThanOrEqual" in value) {
            if (item[key] < value.greaterThanOrEqual) return false;
          }
          if ("lessThanOrEqual" in value) {
            if (item[key] > value.lessThanOrEqual) return false;
          }
        } else {
          if (item[key] !== value) return false;
        }
      }
      return true;
    });
  }

  private applyFilterGroup(
    query: QueryableType,
    filterGroup: IResourceFilterGroup
  ): Collection {
    const collection = query as Collection;
    const applyCondition =
      filterGroup.condition === FilterCombinationMethod.AND ? "and" : "or";

    return collection.filter((item) => {
      const results = filterGroup.filters.map((filter) => {
        if ("condition" in filter) {
          return this.applyFilterGroup(
            collection,
            filter as IResourceFilterGroup
          );
        } else {
          return this.applyFilter(item, filter as IResourceFilter);
        }
      });

      return applyCondition === "and"
        ? results.every(Boolean)
        : results.some(Boolean);
    });
  }

  private applySearch(
    collection: Collection,
    search: { query: string; properties?: string[]; isCaseSensitive?: boolean }
  ): Collection {
    const {
      query: searchQuery,
      properties = [],
      isCaseSensitive = false
    } = search;

    return collection.filter((item) => {
      return properties.some((prop) => {
        const value = String(item[prop]);
        if (isCaseSensitive) {
          return value.includes(searchQuery);
        } else {
          return value.toLowerCase().includes(searchQuery.toLowerCase());
        }
      });
    });
  }

  async selectMany(
    resource: Resource,
    params?: IResourceSelectParams
  ): Promise<any> | undefined {
    const query = this.translateToDexieQuery(
      this.instance?.table(resource),
      params
    );
    if (!query) return;
    const result = await query;
    logger.log({ at: "DexiePersistence.selectMany", resource, params, query, result });
    if (Array.isArray(result)) {
      return result;
    }
    return result.toArray();
  }

  select(
    resourceId: IRecordId,
    properties?: string[]
  ): Promise<any> | undefined {
    const resource = this.resolveResource(resourceId);
    // const id = this.resolveId(resourceId);
    const id = resourceId.toString();
    logger.log({ at: "DexiePersistence.select", resource, resourceId, id });
    if (!resource || !id) return;
    return this.instance?.table(resource).get(id);
  }
}
