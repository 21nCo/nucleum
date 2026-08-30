import type {
  ILocal,
  IPersistence,
  IPersistenceInitParams
} from "@21n/persistence/persistence.type";
import { logger } from "@21n/components/debug/logger.client";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import type {
  IMetaResource,
  IResource
} from "@21n/components/flux/resourceStores/resource.type";
import {
  PersistenceActionType,
  type IMutationParamsv2,
  type IRecordId,
  type IResourceSelectParams,
  type IResourceSelectProperties
} from "@21n/types/data.type";
import { compareVersions } from "@21n/shared-utils/utils";
import { Product } from "@21n/products/product.type";
import { resolveProductConfig } from "@21n/products/product.config";

function resolveDatabaseName(product: Product) {
  if (!product) return "nativeone";
  return resolveProductConfig(product)?.databaseName ?? "nativeone";
}

interface IndexedDBStore {
  database: IDBDatabase;
  name: string;
}

export class IndexedDBPersistence implements IPersistence {
  private database: IDBDatabase | undefined = undefined;
  private stores: Map<string, IndexedDBStore> = new Map();
  userId: string = "";
  product: Product = Product.NUCLEUM;
  private dbName: string = "";

  constructor() {}

  async initialize(params: IPersistenceInitParams): Promise<number> {
    const user = params.userId ?? params.dapId;
    if (this.userId === user && this.database) return -1;

    try {
      const databaseName = resolveDatabaseName(params.product as Product);
      this.dbName = `${databaseName}_${user}`;
      this.userId = user;
      this.product = params.product as Product;

      logger.info({
        at: "indexeddb.persistence.initialize",
        params,
        databaseName: this.dbName
      });

      // Open the database with current version or version 1 for new databases
      this.database = await this.openDatabaseWithVersionHandling(this.dbName);

      // Check local log
      const localLog: ILocal = await this.select("kv:local");
      logger.info({
        at: "indexeddb.persistence.initialize - local",
        localLog
      });

      if (!localLog?.id) {
        await this.addLocalLog(params);
        await this.updateDbo(params);
        return 0;
      }

      if (localLog.version && params?.appVersion) {
        logger.log({
          at: "indexeddb.local - app version",
          localVersion: localLog.version,
          currentVersion: params?.appVersion
        });
        const comparer = compareVersions(localLog.version, params?.appVersion);
        if (comparer !== 0) {
          await this.updateAppVersion(params?.appVersion);
          await this.updateDbo(params);
        }
      }

      if (localLog.isLocalMode) return 2;
      return 1;
    } catch (err) {
      logger.error({ at: "indexeddb.persistence.initialize", err });
      return -1;
    }
  }

  private async openDatabaseWithVersionHandling(
    name: string
  ): Promise<IDBDatabase> {
    // First try to open without specifying version to get current version
    try {
      const currentDb = await this.getCurrentDatabase(name);
      if (currentDb) {
        const currentVersion = currentDb.version;
        currentDb.close();
        return await this.openDatabase(name, currentVersion);
      }
    } catch (error) {
      // Database doesn't exist yet, continue with version 1
    }

    // If database doesn't exist, start with version 1
    return await this.openDatabase(name, 1);
  }

  private async getCurrentDatabase(name: string): Promise<IDBDatabase | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name);

      request.onerror = () => {
        resolve(null);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = () => {
        // This means database doesn't exist
        resolve(null);
      };
    });
  }

  private async openDatabase(
    name: string,
    version: number
  ): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores for common resources if they don't exist
        const resourceTypes = [
          Resource.kv,
          Resource.collection,
          Resource.node,
          Resource.file,
          Resource.link,
          Resource.mutation,
          Resource.tz
        ];

        for (const resource of resourceTypes) {
          if (!db.objectStoreNames.contains(resource)) {
            const store = db.createObjectStore(resource, { keyPath: "id" });
            // Create indexes for common queries
            store.createIndex("createdAt", "createdAt", { unique: false });
            store.createIndex("updatedAt", "updatedAt", { unique: false });
          }
        }
      };
    });
  }

  private async getObjectStore(
    resource: string,
    mode: IDBTransactionMode = "readonly"
  ): Promise<IDBObjectStore> {
    if (!this.database) {
      throw new Error("Database not initialized");
    }

    // Create the object store if it doesn't exist
    if (!this.database.objectStoreNames.contains(resource)) {
      this.database.close();
      const version = this.database.version + 1;
      this.database = await this.openDatabaseWithNewStore(
        this.dbName,
        version,
        resource
      );
    }

    const transaction = this.database.transaction([resource], mode);
    return transaction.objectStore(resource);
  }

  private async openDatabaseWithNewStore(
    name: string,
    version: number,
    newResource: string
  ): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(newResource)) {
          const store = db.createObjectStore(newResource, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };
    });
  }

  async reinitialize(): Promise<boolean> {
    try {
      if (this.database) {
        this.database.close();
      }
      this.stores.clear();
      this.database = undefined;
      return true;
    } catch (error) {
      logger.error({ at: "indexeddb.reinitialize", error });
      return false;
    }
  }

  async terminate(): Promise<boolean> {
    try {
      if (this.database) {
        this.database.close();
      }
      this.stores.clear();
      this.database = undefined;
      return true;
    } catch (error) {
      logger.error({ at: "indexeddb.terminate", error });
      return false;
    }
  }

  private async addLocalLog(params?: IPersistenceInitParams) {
    const localRecord = {
      id: "local",
      createdAt: new Date().toISOString(),
      version: params?.appVersion,
      isLocalMode: !params?.userId,
      dapId: params?.dapId
    };
    await this.insertRecord(Resource.kv, localRecord);
  }

  private async updateAppVersion(version: string) {
    const localRecord = await this.select("kv:local");
    if (localRecord) {
      const updatedRecord = {
        ...localRecord,
        version: version,
        updatedAt: new Date().toISOString()
      };
      await this.insertRecord(Resource.kv, updatedRecord);
    }
  }

  async mutation<T extends IResource | IMetaResource>(
    resource: Resource,
    params: IMutationParamsv2<T>
  ) {
    try {
      switch (params.action) {
        case PersistenceActionType.INSERT:
          return await this.bulkInsert(resource, params.records);
        case PersistenceActionType.REPLACE:
          return await this.replace(params.record);
        case PersistenceActionType.MERGE:
          return await this.merge(params.record);
        case PersistenceActionType.DELETE:
          return await this.delete(params.recordId);
        case PersistenceActionType.BULK_DELETE:
          return await this.deleteMany(params.recordIds);
        case PersistenceActionType.BULK_MERGE:
          return await this.bulkEdit(resource, params.records);
        case PersistenceActionType.CUSTOM:
          logger.log({
            at: "indexeddb.mutation",
            message: "Custom action not implemented"
          });
          return;
      }
    } catch (error) {
      logger.error({ at: "indexeddb.mutation", resource, params, error });
    }
  }

  async updateDbo(params?: IPersistenceInitParams) {
    try {
      const dboRecord = {
        id: "dbo",
        value: params?.dbo ?? [],
        createdAt: new Date().toISOString()
      };

      const existingRecord = await this.select("kv:dbo");
      if (existingRecord) {
        const updatedRecord = {
          ...existingRecord,
          value: dboRecord.value,
          updatedAt: new Date().toISOString()
        };
        await this.insertRecord(Resource.kv, updatedRecord);
      } else {
        await this.insertRecord(Resource.kv, dboRecord);
      }
    } catch (error) {
      logger.error({ at: "indexeddb.updateDbo", error });
    }
  }

  private async insertRecord(resource: string, record: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getObjectStore(resource, "readwrite")
        .then((store) => {
          const request = store.put(record);
          request.onsuccess = () => resolve(record);
          request.onerror = () => reject(request.error);
        })
        .catch(reject);
    });
  }

  async insert<T extends IResource | IMetaResource>(
    records: T[],
    resource: string
  ): Promise<T[] | null> {
    try {
      const store = await this.getObjectStore(resource, "readwrite");
      const insertedRecords: T[] = [];

      for (const record of records) {
        await new Promise<void>((resolve, reject) => {
          const request = store.put(record);
          request.onsuccess = () => {
            insertedRecords.push(record);
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      }

      return insertedRecords;
    } catch (error) {
      logger.error({ at: "indexeddb.insert", error, resource });
      return null;
    }
  }

  async bulkInsert(resource: string, records: any[]) {
    try {
      const results = [];
      for (const record of records) {
        const result = await this.insertRecord(resource, record);
        results.push(result);
      }
      return results;
    } catch (error) {
      logger.error({ at: "indexeddb.bulkInsert", error, resource });
    }
  }

  replace<T extends IResource | IMetaResource>(
    record: T
  ): Promise<any> | undefined {
    return this.insertRecord(this.resolveResource(record.id!), record);
  }

  async merge<T extends IResource | IMetaResource>(
    record: Partial<T>,
    params?: { isUpsert?: boolean }
  ): Promise<any> {
    try {
      const resourceName = this.resolveResource(record.id!);
      const existing = await this.select(record.id!);

      const mergedRecord = existing
        ? { ...existing, ...record, updatedAt: new Date().toISOString() }
        : {
            ...record,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

      return await this.insertRecord(resourceName, mergedRecord);
    } catch (error) {
      logger.error({ at: "indexeddb.merge", error, record });
    }
  }

  async delete(resourceId: IRecordId): Promise<any> {
    return new Promise((resolve, reject) => {
      const resourceName = this.resolveResource(resourceId);
      const id = this.resolveId(resourceId);

      this.getObjectStore(resourceName, "readwrite")
        .then((store) => {
          const request = store.delete(id);
          request.onsuccess = () => resolve(true);
          request.onerror = () => reject(request.error);
        })
        .catch(reject);
    });
  }

  async deleteMany(recordIds: IRecordId[]) {
    try {
      const results = [];
      for (const recordId of recordIds) {
        const result = await this.delete(recordId);
        results.push(result);
      }
      return results;
    } catch (error) {
      logger.error({ at: "indexeddb.deleteMany", error, recordIds });
    }
  }

  async bulkEdit<T extends IResource | IMetaResource>(
    resource: Resource,
    records: T[]
  ): Promise<any> {
    try {
      const results = [];
      for (const record of records) {
        const result = await this.merge(record);
        results.push(result);
      }
      return results;
    } catch (error) {
      logger.error({ at: "indexeddb.bulkEdit", error, resource, records });
    }
  }

  async query(query: string, params: any): Promise<any> {
    logger.log({
      at: "indexeddb.query",
      message: "Raw query execution not supported in IndexedDB implementation",
      query,
      params
    });
    return undefined;
  }

  async select(
    resourceId: IRecordId,
    properties?: IResourceSelectProperties
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const resourceName = this.resolveResource(resourceId);
      const id = this.resolveId(resourceId);

      this.getObjectStore(resourceName, "readonly")
        .then((store) => {
          const request = store.get(id);
          request.onsuccess = () => {
            const result = request.result;
            if (!result) {
              resolve(null);
              return;
            }

            if (
              properties &&
              properties.select &&
              properties.select.length > 0
            ) {
              const filtered: any = {};
              for (const prop of properties.select) {
                if (result[prop] !== undefined) {
                  filtered[prop] = result[prop];
                }
              }
              resolve(filtered);
            } else {
              resolve(result);
            }
          };
          request.onerror = () => reject(request.error);
        })
        .catch(reject);
    });
  }

  async selectMany(
    resource: Resource,
    params?: IResourceSelectParams,
    signal?: AbortSignal
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getObjectStore(resource, "readonly")
        .then((store) => {
          const results: any[] = [];
          let cursor: IDBRequest;

          // Apply ordering if specified
          if (params?.orderBy) {
            const orderByKey = Object.keys(params.orderBy)[0];
            const direction =
              params.orderBy[orderByKey] === "asc" ? "next" : "prev";

            if (store.indexNames.contains(orderByKey)) {
              const index = store.index(orderByKey);
              cursor = index.openCursor(null, direction);
            } else {
              cursor = store.openCursor(null, direction);
            }
          } else {
            cursor = store.openCursor();
          }

          cursor.onsuccess = (event) => {
            const cursorResult = (event.target as IDBRequest).result;
            if (cursorResult) {
              const record = cursorResult.value;

              // Apply filters
              if (this.matchesFilters(record, params?.filters)) {
                // Apply search
                if (
                  !params?.search ||
                  this.matchesSearch(record, params.search)
                ) {
                  results.push(record);
                }
              }

              cursorResult.continue();
            } else {
              // Apply offset and limit
              let finalResults = results;
              if (params?.offset) {
                finalResults = finalResults.slice(params.offset);
              }
              if (params?.limit) {
                finalResults = finalResults.slice(0, params.limit);
              }

              resolve(finalResults);
            }
          };

          cursor.onerror = () => reject(cursor.error);
        })
        .catch(reject);
    });
  }

  private matchesFilters(record: any, filters: any): boolean {
    if (!filters) return true;

    if ("condition" in filters) {
      // Handle filter groups
      return this.matchesFilterGroup(record, filters);
    } else {
      // Handle simple filters
      for (const [key, value] of Object.entries(filters)) {
        if (record[key] !== value) {
          return false;
        }
      }
      return true;
    }
  }

  private matchesFilterGroup(record: any, filterGroup: any): boolean {
    // Basic implementation - would need to be expanded for complex filter groups
    return true;
  }

  private matchesSearch(
    record: any,
    search: { query: string; properties?: string[]; isCaseSensitive?: boolean }
  ): boolean {
    const searchQuery = search.isCaseSensitive
      ? search.query
      : search.query.toLowerCase();

    if (search.properties && search.properties.length > 0) {
      return search.properties.some((prop) => {
        const value = record[prop];
        if (typeof value === "string") {
          const searchValue = search.isCaseSensitive
            ? value
            : value.toLowerCase();
          return searchValue.includes(searchQuery);
        }
        return false;
      });
    }

    // Search all string properties if no specific properties provided
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string") {
        const searchValue = search.isCaseSensitive
          ? value
          : value.toLowerCase();
        if (searchValue.includes(searchQuery)) {
          return true;
        }
      }
    }

    return false;
  }

  private resolveResource(id: IRecordId | Resource): string {
    if (typeof id === "string") {
      return id.split(":")[0];
    }
    return id?.tb || "";
  }

  private resolveId(id: IRecordId | Resource): string {
    if (typeof id === "string") {
      return id.split(":")[1] || id;
    }
    return id?.id?.toString() || "";
  }
}
