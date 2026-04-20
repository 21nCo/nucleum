import { logger } from "@21n/components/debug/logger.client";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import type {
  IMetaResource,
  IResource
} from "@21n/components/flux/resourceStores/resource.type";
import { removeDuplicatesFilter } from "@21n/components/flux/resourceStores/resource.utils";
import {
  FilterCombinationMethod,
  IResourceFilterOperator,
  PersistenceActionType,
  type IMutationParamsv2,
  type IRecordId,
  type IResourceFilterGroup,
  type IResourceSearch,
  type IResourceSelectParams,
  type IResourceSelectProperties
} from "@21n/types/data.type";
import { parse } from "@21n/shared-utils/json.utils";
import { deepCopy } from "@21n/shared-utils/obj.utils";
import { isValidString } from "@21n/shared-utils/text.utils";
import {
  ClientStorageKey,
  type IPersistence,
  type IPersistenceInitParams,
  type ITable
} from "@21n/persistence/persistence.type";
import { clientStorage } from "@21n/persistence/persistence.utils";
import { Dexie, type Collection, type Table, type WhereClause } from "dexie";
import { SearchFn } from "searchfn";
import { extractSearchFields as extractSearchFieldsUtil } from "@21n/utils/textUtils";
import { indexingStore } from "@21n/persistence/dexie/indexing.store";

// import {
//   Worker as WorkerIndex,
//   Document as DocumentWorkerIndex
// } from "./dist/flexsearch.bundle.module.min.js";
type QueryableType = Table | Collection<any, any> | WhereClause<any, any>;
const dbVersion = 1;
const version = 120;
export class DexiePersistence implements IPersistence {
  instance: Dexie | undefined = undefined;
  tables: ITable[] = [];
  userId: string = "";
  searchIndices: Map<string, SearchFn> = new Map();
  private indexingWorker: SharedWorker | undefined = undefined;
  private isIndexingInProgress: boolean = false;
  private indexingProgress: number = 0;
  private isSearchRecoveryPending: boolean = false;

  constructor() {}

  private sanitizeForStorage<T>(value: T): T {
    if (value === undefined || value === null) return value;
    if (typeof value !== "object") return value;
    return deepCopy(value);
  }

  async initialize(params: IPersistenceInitParams): Promise<number> {
    logger.info({ at: "DexiePersistence.initialize", params });
    const user = params.userId ?? params.dapId;
    if (this.userId === user && this.instance) return -1;
    const dbName = `${user}-${dbVersion}`;
    this.instance = new Dexie(dbName);
    let tables = params.tables;
    if (
      params.isExtensionEnvironment &&
      (!tables || tables.length === 0 || tables.length === 2)
    ) {
      const tablesVal = await clientStorage.get(ClientStorageKey.TABLES);
      if (tablesVal) tables = [...(tables ?? []), ...parse(tablesVal)];
    }
    const stores =
      tables?.reduce(
        (acc, table) => {
          acc[table.name] = table.indices.join(", ");
          return acc;
        },
        {} as { [key: string]: string }
      ) ?? {};
    this.instance.version(version).stores(stores);
    this.userId = user;
    if (tables) {
      this.tables = tables;
      if (!params.isExtensionEnvironment) {
        await this.initializeSearchIndices();
      } else if (params.tables) {
        await clientStorage.set(ClientStorageKey.TABLES, params.tables);
      }
    }
    const initLog = await this.select("kv:local");
    logger.log({ at: "DexiePersistence.initialize", initLog });
    if (initLog) {
      return 1;
    }
    await this.addInitializationLog(params);
    return 0;
  }

  async performBatchedIndexing() {
    const clearPromises: Array<ReturnType<SearchFn["clear"]>> = [];
    this.searchIndices.forEach((engine) => {
      clearPromises.push(engine.clear());
    });
    await Promise.all(clearPromises);

    this.searchIndices.clear();
    await this.initializeSearchIndices();

    let totalRecords = 0;
    const tablesToIndex = this.tables.filter(
      (t) => t.searchIndices && t.searchIndices.length > 0
    );

    for (const table of tablesToIndex) {
      const count = await this.instance?.table(table.name).count();
      totalRecords += count || 0;
    }

    indexingStore.setTotalRecords(totalRecords);
    let indexedRecords = 0;

    for (const table of tablesToIndex) {
      indexingStore.setCurrentTable(table.name as string);

      const records = await this.instance?.table(table.name).toArray();
      if (!records) continue;

      const searchEngine = this.searchIndices.get(table.name);
      if (!searchEngine) continue;

      // Transform records to searchfn format
      const documents = records
        .map((record) => {
          const fields = this.extractSearchFields(record, table.name);
          if (!record?.id || !fields) return null;
          return { id: record.id, fields };
        })
        .filter(
          (doc): doc is { id: string; fields: Record<string, string> } =>
            doc !== null
        );

      // Use bulk indexing API for better performance
      // BatchSize controls parallel processing batch size (default: 100 for memory efficiency)
      await searchEngine.addBulk(documents, {
        batchSize: 100, // Parallel batch size - balance between speed and memory
        onProgress: (indexed, total) => {
          indexedRecords = totalRecords - documents.length + indexed;
          const progress =
            totalRecords > 0
              ? Math.floor((indexedRecords / totalRecords) * 100)
              : 100;
          this.indexingProgress = progress;

          indexingStore.updateProgress({
            progress,
            indexedRecords,
            totalRecords,
            currentTable: table.name as string
          });
        }
      });

      indexedRecords += documents.length;
    }
  }

  async triggerBackgroundIndexing(
    useSharedWorker: boolean = false
  ): Promise<void> {
    if (this.isIndexingInProgress) {
      logger.info({
        at: "DexiePersistence.triggerBackgroundIndexing",
        message: "Indexing already in progress"
      });
      return;
    }

    if (!useSharedWorker) {
      try {
        this.isIndexingInProgress = true;
        this.indexingProgress = 0;
        indexingStore.setIndexing(true);
        indexingStore.reset();

        logger.info({
          at: "DexiePersistence.triggerBackgroundIndexing",
          message:
            "Starting in-process FlexSearch indexing with IndexedDB persistence"
        });

        await this.performBatchedIndexing();

        this.isIndexingInProgress = false;
        this.indexingProgress = 100;
        indexingStore.complete();
      } catch (error) {
        logger.error({
          at: "DexiePersistence.triggerBackgroundIndexing",
          error
        });
        this.isIndexingInProgress = false;
        indexingStore.setError(error as string);
        indexingStore.setIndexing(false);
      }
      return;
    }

    try {
      this.isIndexingInProgress = true;
      this.indexingProgress = 0;
      indexingStore.setIndexing(true);
      indexingStore.reset();

      if (typeof SharedWorker === "undefined") {
        logger.warn({
          at: "DexiePersistence.triggerBackgroundIndexing",
          message:
            "SharedWorker not supported, falling back to batched indexing"
        });
        await this.performBatchedIndexing();
        this.isIndexingInProgress = false;
        indexingStore.complete();
        return;
      }

      const WorkerConstructor = (
        await import("./dexie.indexing.worker.ts?sharedworker")
      ).default;

      logger.info({
        at: "DexiePersistence.triggerBackgroundIndexing",
        message: "Creating SharedWorker for background indexing"
      });

      this.indexingWorker = new WorkerConstructor({
        name: "dexie-indexing-worker"
      });

      this.indexingWorker.port.onmessage = (event: MessageEvent) => {
        const { type, payload } = event.data;

        switch (type) {
          case "LOG":
            logger.info({
              at: "DexiePersistence.worker-log",
              message: payload.message,
              data: payload.data,
              timestamp: payload.timestamp
            });
            break;

          case "PROGRESS":
            this.indexingProgress = payload.progress ?? 0;
            indexingStore.updateProgress({
              progress: payload.progress,
              currentTable: payload.currentTable,
              indexedRecords: payload.indexedRecords,
              totalRecords: payload.totalRecords
            });
            logger.debug({
              at: "DexiePersistence.triggerBackgroundIndexing - progress",
              progress: this.indexingProgress,
              currentTable: payload.currentTable,
              indexedRecords: payload.indexedRecords,
              totalRecords: payload.totalRecords
            });
            break;

          case "COMPLETE":
            logger.info({
              at: "DexiePersistence.triggerBackgroundIndexing - complete",
              totalRecords: payload.totalRecords
            });
            this.isIndexingInProgress = false;
            this.indexingProgress = 100;
            indexingStore.complete();

            logger.info({
              at: "DexiePersistence.triggerBackgroundIndexing",
              message:
                "Worker indexing complete - SearchFn persists automatically"
            });

            break;

          case "ERROR":
            logger.error({
              at: "DexiePersistence.triggerBackgroundIndexing - error",
              error: payload.error
            });
            this.isIndexingInProgress = false;
            indexingStore.setError(payload.error);
            indexingStore.setIndexing(false);
            break;
        }
      };

      this.indexingWorker.port.postMessage({
        type: "START_INDEXING",
        payload: {
          userId: this.userId,
          dbVersion,
          indexMethod: "searchfn",
          tables: this.tables
            .filter((t) => t.searchIndices && t.searchIndices.length > 0)
            .map((t) => ({
              name: t.name as string,
              indices: t.indices,
              searchIndices: t.searchIndices ?? []
            }))
        }
      });

      this.indexingWorker.port.start();
    } catch (error) {
      logger.error({
        at: "DexiePersistence.triggerBackgroundIndexing",
        error
      });
      this.isIndexingInProgress = false;
      await this.performBatchedIndexing();
    }
  }

  getIndexingProgress(): { isIndexing: boolean; progress: number } {
    return {
      isIndexing: this.isIndexingInProgress,
      progress: this.indexingProgress
    };
  }

  async initializeSearchIndices() {
    const dbName = `${this.userId}-${dbVersion}`;
    const name = `${dbName}-#tableName#-search`;
    await this.initializeFlatSearchIndexes(name);
  }

  async initializeFlatSearchIndexes(dbName: string) {
    for (const table of this.tables ?? []) {
      if (!table.searchIndices || table.searchIndices.length === 0) continue;

      const indexName = dbName.replace("#tableName#", table.name);

      const searchEngine = new SearchFn({
        name: indexName,
        fields: table.searchIndices, // Use actual field names
        pipeline: {
          enableStemming: true,
          language: "en",
          enableEdgeNGrams: true, // Enable prefix/autocomplete search
          edgeNGramMinLength: 2,
          edgeNGramMaxLength: 15
        },
        cache: {
          terms: 2048,
          vectors: 512
        }
      });

      this.searchIndices.set(table.name, searchEngine);
    }
  }

  async reinitialize() {
    logger.info({ at: "DexiePersistence.reinitialize" });
    await this.terminate();
    return true;
  }

  async terminate() {
    logger.info({ at: "DexiePersistence.terminate" });
    await this.instance?.close();
    this.instance = undefined;
    return true;
  }

  private async addInitializationLog(params?: IPersistenceInitParams) {
    await this.instance?.table(Resource.kv).add({
      id: "kv:local",
      createdAt: new Date(),
      isLocalMode: !params?.userId,
      dapId: params?.dapId
    });
  }
  private extractSearchFields(
    record: any,
    resource: Resource
  ): Record<string, string> | undefined {
    const searchIndices = this.tables.find(
      (x) => x.name === resource
    )?.searchIndices;
    if (!searchIndices || searchIndices.length === 0) return undefined;

    try {
      return extractSearchFieldsUtil(record, searchIndices);
    } catch (e) {
      logger.error({
        at: "DexiePersistence.extractSearchFields",
        tables: this.tables,
        searchIndices,
        e
      });
      return undefined;
    }
  }

  async mutation<T extends IResource | IMetaResource>(
    resource: Resource,
    params: IMutationParamsv2<T>
  ) {
    switch (params.action) {
      case PersistenceActionType.INSERT:
        const records = params.records.map((record) => {
          return this.sanitizeForStorage({
            ...record,
            id: record.id?.toString()
          });
        });
        const shouldSkipIndexing = (params as any).isSkipFlexSearchIndexing;
        const table = this.instance?.table(resource);
        if (!table) return;
        const putResult = await table.bulkPut(records);
        if (!shouldSkipIndexing && this.searchIndices.has(resource)) {
          const searchEngine = this.searchIndices.get(resource);
          if (searchEngine) {
            await Promise.all(
              records
                .map((r) => {
                  const fields = this.extractSearchFields(r, resource);
                  return r.id && fields
                    ? searchEngine.add({ id: r.id, fields }).catch(() => void 0)
                    : null;
                })
                .filter(Boolean) as Promise<unknown>[]
            );
          }
        }
        return putResult;
      case PersistenceActionType.BULK_INSERT:
        return this.bulkInsert(
          resource,
          params.records,
          (params as any).isSkipFlexSearchIndexing
        );
      case PersistenceActionType.REPLACE:
        return this.instance?.table(resource).put(params.record);
      case PersistenceActionType.MERGE:
        if (!params.record.id) {
          logger.error({
            at: "DexiePersistence.mutation merge",
            error: "Record id is required for merge"
          });
          return Promise.reject(new Error("Record id is required for merge"));
        }
        if (this.searchIndices.has(resource)) {
          try {
            const searchEngine = this.searchIndices.get(resource);
            if (searchEngine && params.record.id) {
              try {
                await searchEngine.remove(params.record.id);
              } catch (e) {}

              const fields = this.extractSearchFields(params.record, resource);
              if (fields) {
                await searchEngine.add({
                  id: params.record.id,
                  fields
                });
              }
            }
          } catch (error) {
            logger.error({
              at: "DexiePersistence.mutation merge - searchIndex update error",
              id: params.record.id,
              error
            });
          }
        }
        return this.merge(resource, params.record.id, params.record);
      case PersistenceActionType.DELETE:
        logger.log({ at: "DexiePersistence.mutation delete", params });
        const dbResult = await this.instance
          ?.table(resource)
          .delete(params.recordId.toString());
        if (this.searchIndices.has(resource) && params.recordId) {
          const searchEngine = this.searchIndices.get(resource);
          if (searchEngine) {
            await searchEngine
              .remove(params.recordId.toString())
              .catch(() => void 0);
          }
        }
        return dbResult;
      case PersistenceActionType.BULK_DELETE:
        return this.instance
          ?.table(resource)
          .bulkDelete(params.recordIds.map((id) => id.toString()));
      case PersistenceActionType.BULK_MERGE:
        return this.bulkMerge(resource, params.recordIds, params.changes);
      case PersistenceActionType.CUSTOM:
        return;
    }
  }

  async merge(resource: Resource, id: IRecordId, data: any) {
    try {
      const sanitizedData = this.sanitizeForStorage(data);
      const result = await this.instance?.table(resource).update(id, sanitizedData);
      logger.log({
        at: "DexiePersistence.merge",
        id,
        data: sanitizedData,
        result,
        resource
      });
      if (result === 0) {
        return this.instance
          ?.table(resource)
          .put({ ...sanitizedData, id });
      }
      return result;
    } catch (e) {
      logger.error({ at: "DexiePersistence.merge", id, data, e });
    }
  }

  async bulkInsert(
    resource: Resource,
    records: any[],
    isSkipFlexSearchIndexing?: boolean
  ) {
    try {
      const table = this.instance?.table(resource);
      if (!table) return;

      const formattedRecords = records.map((record) => ({
        ...record,
        id: record.id?.toString()
      }));

      const result = await table.bulkPut(formattedRecords);

      if (!isSkipFlexSearchIndexing && this.searchIndices.has(resource)) {
        const searchEngine = this.searchIndices.get(resource);
        if (searchEngine) {
          await Promise.all(
            formattedRecords
              .map((record) => {
                const fields = this.extractSearchFields(record, resource);
                return record.id && fields
                  ? searchEngine
                      .add({ id: record.id, fields })
                      .catch(() => void 0)
                  : null;
              })
              .filter(Boolean) as Promise<unknown>[]
          );
        }
      }

      logger.log({
        at: "DexiePersistence.bulkInsert",
        resource,
        totalRecords: records.length,
        result
      });

      return result;
    } catch (e) {
      logger.error({
        at: "DexiePersistence.bulkInsert",
        resource,
        totalRecords: records.length,
        e
      });
      throw e;
    }
  }

  async bulkMerge(resource: Resource, recordIds: IRecordId[], changes: any) {
    try {
      const table = this.instance?.table(resource);
      if (!table) return;
      const sanitizedChanges = this.sanitizeForStorage(changes);

      const stringIds = recordIds.map((id) => id.toString());

      const existingRecords = await table
        .where("id")
        .anyOf(stringIds)
        .toArray();
      const existingRecordsMap = new Map(
        existingRecords.map((record) => [record.id, record])
      );

      const recordsToUpdate = stringIds.map((id) => {
        const existing = existingRecordsMap.get(id);
        return existing
          ? { ...existing, ...sanitizedChanges }
          : { ...sanitizedChanges, id };
      });

      const result = await table.bulkPut(recordsToUpdate);

      logger.log({
        at: "DexiePersistence.bulkMerge",
        recordIds,
        changes: sanitizedChanges,
        result,
        resource
      });

      return result;
    } catch (e) {
      logger.error({
        at: "DexiePersistence.bulkMerge",
        recordIds,
        changes,
        e
      });
      throw e;
    }
  }

  private resolveResource(id: IRecordId | Resource): Resource {
    const idString = id.toString();
    return idString.split(":")[0] as Resource;
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

  private async translateToDexieQuery(
    table: Table | undefined,
    params: {
      selectParams?: IResourceSelectParams;
      isReturnCount?: boolean;
    }
  ): Promise<Collection | undefined> {
    try {
      if (!table) return undefined;
      let query: QueryableType = table;
      const { orderBy, filters, search, offset, limit, groupBy } =
        params.selectParams ?? {};
      if (orderBy && (!filters || "condition" in filters)) {
        const entries = Object.entries(orderBy);
        if (entries.length > 0) {
          const [key, order] = entries[0];
          const tableQuery = table.orderBy(key);
          query = order === "desc" ? tableQuery.reverse() : tableQuery;
        }
      }

      if (filters) {
        if ("condition" in filters) {
          query = this.applyFilterGroup(query, filters as IResourceFilterGroup);
        } else {
          const filterObj = filters as { [key: string]: any };
          query = this.applyIndexedFilters(table, filterObj);

          const indexedKeys = new Set(
            table.schema.indexes
              .map((index) => index.name)
              .filter((key) => filterObj[key] !== undefined)
          );

          const nonIndexedFilters = Object.fromEntries(
            Object.entries(filterObj).filter(([key]) => !indexedKeys.has(key))
          );

          if (Object.keys(nonIndexedFilters).length > 0) {
            query = this.applyNonIndexedFilters(query, nonIndexedFilters);
          }
        }
      }

      if (search && !filters?.id) {
        query = this.applySearch(query as Collection, search);
      }

      let orderByConfig: { key: string; order: string } | undefined;
      if (orderBy && filters && !("condition" in filters)) {
        const entries = Object.entries(orderBy);
        if (entries.length > 0) {
          const [key, order] = entries[0];
          orderByConfig = {
            key,
            order: order as string
          };
        }
      }

      if (orderByConfig) {
        const collection = query as Collection;
        return {
          toArray: async () => {
            let result = await collection.sortBy(orderByConfig.key);
            if (orderByConfig.order === "desc") {
              result.reverse();
            }
            if (offset !== undefined && limit !== undefined) {
              result = result.slice(offset, offset + limit);
            } else if (offset !== undefined) {
              result = result.slice(offset);
            } else if (limit !== undefined) {
              result = result.slice(0, limit);
            }
            return result;
          }
        } as any;
      }

      if (offset !== undefined) {
        query = (query as Collection).offset(offset);
      }
      if (limit !== undefined) {
        query = (query as Collection).limit(limit);
      }
      if (params.isReturnCount) {
        if (!groupBy || groupBy[0] === "all") {
          return {
            toArray: async () => {
              return await (query as Collection).count();
            }
          } as any;
        } else {
          return {
            toArray: async () => {
              const arr = await (query as Collection).toArray();
              const [groupKey] = groupBy;
              const counts: { [key: string]: number } = {};
              for (const item of arr) {
                const key = item[groupKey] ?? "undefined";
                counts[key] = (counts[key] || 0) + 1;
              }
              return new Map(Object.entries(counts));
            }
          } as any;
        }
      }

      return query as Collection;
    } catch (e) {
      logger.error({ at: "DexiePersistence.translateToDexieQuery", e });
      return undefined;
    }
  }

  private applyIndexedFilters(
    table: Table,
    filters: { [key: string]: any }
  ): QueryableType {
    let query: QueryableType = table;
    const validFilters = table.schema.indexes
      .map((index) => index.name)
      .filter((key) => filters[key] !== undefined)
      .map((key) => [key, filters[key]]);
    if (validFilters.length > 0) {
      const [firstKey, firstValue] = validFilters[0];
      query = this.applyFilter(table, firstKey, firstValue);

      for (let i = 1; i < validFilters.length; i++) {
        const [key, value] = validFilters[i];
        query = query.and((item) => this.checkFilter(item, key, value));
      }
    }
    return query;
  }

  private applyFilter(table: Table, key: string, value: any) {
    if (value === undefined) {
      return table.toCollection();
    }

    if (Array.isArray(value)) {
      return table.where(key).anyOf(value);
    } else if (typeof value === "object" && value) {
      if (
        IResourceFilterOperator.GREATER_THAN in value &&
        IResourceFilterOperator.LESS_THAN in value
      ) {
        return table.where(key).between(value.greaterThan, value.lessThan);
      } else if (
        IResourceFilterOperator.GREATER_THAN_OR_EQUALS in value &&
        IResourceFilterOperator.LESS_THAN_OR_EQUALS in value
      ) {
        return table
          .where(key)
          .between(value.greaterThanOrEqual, value.lessThanOrEqual, true, true);
      } else if (IResourceFilterOperator.GREATER_THAN in value) {
        return table.where(key).above(value.greaterThan);
      } else if (IResourceFilterOperator.LESS_THAN in value) {
        return table.where(key).below(value.lessThan);
      } else if (IResourceFilterOperator.GREATER_THAN_OR_EQUALS in value) {
        return table.where(key).aboveOrEqual(value.greaterThanOrEqual);
      } else if (IResourceFilterOperator.LESS_THAN_OR_EQUALS in value) {
        return table.where(key).belowOrEqual(value.lessThanOrEqual);
      } else if (IResourceFilterOperator.NOT_IN in value) {
        return table.where(key).noneOf(value.notIn);
      } else if (IResourceFilterOperator.NOT_EQUALS in value) {
        return table.where(key).notEqual(value.notEquals);
      } else if (IResourceFilterOperator.CONTAINS in value) {
        return table.where(key).equals(value.contains);
      }
    } else if (value === false) {
      return table.where(key).anyOf(["$NONE", "false", "", [], 0]);
    }
    return table.where(key).equals(value);
  }

  private checkFilter(item: any, key: string, value: any): boolean {
    if (value === undefined) {
      return true;
    }
    if (Array.isArray(value)) {
      if (!value.includes(item[key])) return false;
    } else if (typeof value === "object" && value !== null) {
      if (
        IResourceFilterOperator.GREATER_THAN in value &&
        item[key] <= value.greaterThan
      ) {
        return false;
      }
      if (
        IResourceFilterOperator.LESS_THAN in value &&
        item[key] >= value.lessThan
      ) {
        return false;
      }
      if (
        IResourceFilterOperator.GREATER_THAN_OR_EQUALS in value &&
        item[key] < value.greaterThanOrEqual
      ) {
        return false;
      }
      if (
        IResourceFilterOperator.LESS_THAN_OR_EQUALS in value &&
        item[key] > value.lessThanOrEqual
      ) {
        return false;
      }
      if (
        IResourceFilterOperator.NOT_IN in value &&
        value.notIn.includes(item[key])
      ) {
        return false;
      } else if (
        IResourceFilterOperator.CONTAINS in value &&
        !item[key]?.includes(value.contains)
      ) {
        return false;
      } else if (
        IResourceFilterOperator.NOT_EQUALS in value &&
        item[key] === value.notEquals
      ) {
        return false;
      }
    } else {
      if (value === false) {
        if (item[key] && item[key] !== "$NONE") return false;
      } else if (item[key] !== value) return false;
    }
    return true;
  }

  private applyNonIndexedFilters(
    query: QueryableType,
    filters: { [key: string]: any }
  ): Collection {
    return (query as Collection).filter((item) => {
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined) {
          continue;
        }
        if (!this.checkFilter(item, key, value)) {
          return false;
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
          const resourceFilter = filter as { [key: string]: any };
          const [[key, value]] = Object.entries(resourceFilter);
          return this.checkFilter(item, key, value);
        }
      });

      return applyCondition === "and"
        ? results.every(Boolean)
        : results.some(Boolean);
    });
  }

  private applySearch(
    collection: Collection,
    search: IResourceSearch
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

  async preSearchUsingIndex(
    resource: Resource,
    search: IResourceSearch,
    params?: {
      limit?: number;
    }
  ) {
    const id = Math.random().toString(36).substring(2, 15);
    console.time(`preSearchUsingIndex - ${resource} - ${id}`);
    const searchEngine = this.searchIndices.get(resource);
    if (!searchEngine) {
      console.timeEnd(`preSearchUsingIndex - ${resource} - ${id}`);
      return undefined;
    }

    let ids: string[] = [];
    try {
      ids = (
        await searchEngine.search(search.query, {
          limit: params?.limit ?? 50,
          fields: search.properties,
          mode: "auto",
          fuzzy: false,
          applyQueryNGrams: false
        })
      ).map((value) => value.toString());
    } catch (error) {
      logger.error({
        at: "DexiePersistence.preSearchUsingIndex",
        resource,
        search,
        error,
        message: "Search index query failed; falling back to collection scan"
      });
      void this.queueSearchIndexRecovery();
      console.timeEnd(`preSearchUsingIndex - ${resource} - ${id}`);
      return undefined;
    }

    console.timeEnd(`preSearchUsingIndex - ${resource} - ${id}`);
    if (ids.length > 0) {
      return ids.filter(removeDuplicatesFilter);
    }

    return undefined;
  }

  private async queueSearchIndexRecovery() {
    if (this.isSearchRecoveryPending || this.isIndexingInProgress) return;
    this.isSearchRecoveryPending = true;
    try {
      await this.triggerBackgroundIndexing(false);
    } catch (error) {
      logger.error({
        at: "DexiePersistence.queueSearchIndexRecovery",
        error
      });
    } finally {
      this.isSearchRecoveryPending = false;
    }
  }

  /**
   *
   * @param resource
   * @param params
   * @returns
   */
  async selectMany(
    resource: Resource,
    params?: IResourceSelectParams
  ): Promise<any[] | number> {
    const debugResource: Resource[] = [];
    if (debugResource.includes(resource)) {
      logger.debug({
        at: "DexiePersistence.selectMany",
        resource,
        params
      });
    }
    if (params?.search) {
      const ids = await this.preSearchUsingIndex(
        resource,
        params.search,
        params
      );
      console.log({
        at: "selectMany - preSearchUsingIndex",
        resource,
        ids
      });
      if (ids && ids.length > 0) {
        params.filters = {
          id: ids,
          ...params.filters
        };
        delete params.search;
      }
    }

    const isReturnCount =
      params?.properties?.select?.length === 1 &&
      params.properties.select[0] === "#";
    const query = await this.translateToDexieQuery(
      this.instance?.table(resource),
      {
        selectParams: params,
        isReturnCount
      }
    );
    if (!query) return isReturnCount ? 0 : [];
    let result = await query.toArray();
    if (isReturnCount) return result;
    if (
      result &&
      result.length > 0 &&
      params?.properties?.expand &&
      params.properties.expand.length > 0
    ) {
      const expandedResult = await this.selectExpansion(
        result,
        params.properties.expand
      );
      if (expandedResult) {
        result = expandedResult;
      }
    }
    if (debugResource.includes(resource)) {
      logger.debug({
        at: "DexiePersistence.selectMany - result",
        resource,
        params,
        result
      });
    }
    return result;
  }

  async selectExpansion(
    result: any[],
    expandProps: string[]
  ): Promise<any[] | undefined> {
    try {
      for (const prop of expandProps) {
        let allItems = result
          .map((item) => item[prop])
          .filter(Boolean)
          .filter((x) => x !== "$NONE");
        if (Array.isArray(allItems[0])) {
          allItems = allItems.flat();
        }
        allItems = allItems.filter((x) => typeof x === "string");
        if (allItems.length === 0) continue;
        allItems = Array.from(new Set(allItems));
        const resourceType = this.resolveResource(allItems[0]);
        const expandedResult = await this.selectMany(resourceType as Resource, {
          filters: {
            id: [...allItems]
          }
        });
        if (!Array.isArray(expandedResult)) continue;
        result = result.map((item) => {
          if (item[prop] && Array.isArray(item[prop])) {
            item[prop] = item[prop].map((x) => {
              const result = expandedResult.find((y) => y.id === x);
              if (result) {
                return result;
              }
              return x;
            });
          } else if (item[prop]) {
            const result = expandedResult.find((y) => y.id === item[prop]);
            if (result) {
              const parts = prop.split("Id");
              if (parts.length === 2) item[parts[0]] = result;
              else item[prop] = result;
            }
          }
          return item;
        });
      }
      return result;
    } catch (e) {
      logger.error({ at: "DexiePersistence.selectExpansion", e });
    }
  }

  async selectRecursionv2(
    record: unknown,
    recurse: string,
    isFlatten: boolean = false,
    maxDepth: number = 10
  ): Promise<unknown[] | undefined> {
    try {
      console.time("recursionv2");
      if (!record || typeof record !== "object" || !(recurse in record)) return;
      const recurseVal = (record as Record<string, unknown>)[recurse];
      if (!recurseVal || !Array.isArray(recurseVal) || recurseVal.length === 0)
        return;

      const resourceType = this.resolveResource(recurseVal[0]);
      const allIdsToFetch = new Set<string>();
      const recordsMap = new Map<string, unknown>();
      const depthMap = new Map<string, number>();

      const collectIds = (ids: string[], depth: number = 0) => {
        if (depth >= maxDepth) {
          logger.info({
            at: "DexiePersistence.selectRecursionv2",
            message: `Maximum recursion depth ${maxDepth} reached`
          });
          return;
        }
        ids.forEach((id) => {
          allIdsToFetch.add(id);
          depthMap.set(id, depth);
        });
      };
      collectIds(recurseVal, 0);

      let foundNewIds = true;
      while (foundNewIds) {
        foundNewIds = false;
        const currentIds = Array.from(allIdsToFetch);
        const batchResult = await this.selectMany(resourceType, {
          filters: { id: currentIds.filter((id) => !recordsMap.has(id)) }
        });
        if (!Array.isArray(batchResult)) break;
        batchResult.forEach((record: any) => {
          if (record?.id) {
            recordsMap.set(record.id, record);
            if (record[recurse] && Array.isArray(record[recurse])) {
              const currentDepth = depthMap.get(record.id) || 0;
              const childIds = record[recurse].filter(
                (childId: string) => !allIdsToFetch.has(childId)
              );
              if (childIds.length > 0 && currentDepth < maxDepth - 1) {
                collectIds(childIds, currentDepth + 1);
                foundNewIds = true;
              }
            }
          }
        });
      }

      const buildHierarchy = (ids: string[]): unknown[] => {
        return ids
          .map((id) => recordsMap.get(id))
          .filter(Boolean)
          .map((record: any) => {
            const clonedRecord = { ...record };

            if (clonedRecord[recurse] && Array.isArray(clonedRecord[recurse])) {
              const childIds = clonedRecord[recurse];
              if (isFlatten) {
                return [clonedRecord, ...buildHierarchy(childIds)];
              } else {
                clonedRecord[recurse] = buildHierarchy(childIds);
              }
            }
            return isFlatten ? [clonedRecord] : clonedRecord;
          })
          .flat();
      };

      const result = buildHierarchy(recurseVal);
      console.timeEnd("recursionv2");
      return result;
    } catch (e) {
      logger.error({ at: "DexiePersistence.selectRecursionv2", e });
    }
  }

  async select(resourceId: IRecordId, properties?: IResourceSelectProperties) {
    const resource = this.resolveResource(resourceId);
    const debugResource: Resource[] = [];
    if (debugResource.includes(resource)) {
      logger.debug({
        at: "DexiePersistence.select",
        resourceId,
        properties
      });
    }
    const id = resourceId.toString();
    logger.log({ at: "DexiePersistence.select", resource, resourceId, id });
    if (!resource || !id) return;
    let result = await this.instance?.table(resource).get(id);
    if (!result) return;
    if (properties?.recurse) {
      const recurseResult = await this.selectRecursionv2(
        result,
        properties.recurse
      );
      logger.log({ at: "DexiePersistence.select", recurseResult });
      result[properties.recurse] = recurseResult;
    }
    if (properties?.expand && properties.expand.length > 0) {
      const expandedResult = await this.selectExpansion(
        [result],
        properties.expand
      );
      if (debugResource.includes(resource)) {
        logger.debug({
          at: "DexiePersistence.select - expandedResult",
          resourceId,
          expandedResult
        });
      }
      if (expandedResult && expandedResult.length > 0) {
        return expandedResult[0];
      }
    }
    return result;
  }
}
