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
import { LogType } from "@21n/components/debug/debug.type";
import { compareVersions } from "@21n/shared-utils/utils";
import { dispatchCustomEvent } from "@21n/utils/browser.utils";
import { GlobalEvent } from "@21n/types/event.enum";
import { generateMiniRandomId } from "@21n/shared-utils/crypto.utils";
import { Product } from "@21n/products/product.type";
import { resolveProductConfig } from "@21n/products/product.config";

// Dynamic imports for SignalDB
const loadSignalDB = async () => {
  const { Collection } = await import("@signaldb/core");
  const OPFSAdapter = (await import("@signaldb/opfs")).default;
  return { Collection, OPFSAdapter };
};

function resolveDatabaseName(product: Product) {
  if (!product) return "nativeone";
  return resolveProductConfig(product)?.databaseName ?? "nativeone";
}

export class SignalDBPersistence implements IPersistence {
  private collections: Map<string, any> = new Map();
  private adapter: any = undefined;
  userId: string = "";
  product: Product = Product.NUCLEUS;

  constructor() {}

  /**
   * Initialize SignalDB with OPFS adapter for persistent storage
   */
  async initialize(params: IPersistenceInitParams) {
    const user = params.userId ?? params.dapId;
    if (this.userId === user && this.collections.size > 0) return -1;

    try {
      const { Collection, OPFSAdapter } = await loadSignalDB();

      const databaseName = resolveDatabaseName(this.product);
      this.adapter = new (OPFSAdapter as any)(`${databaseName}_${user}`);

      this.userId = user;
      this.product = params.product as Product;

      logger.info({
        at: "signaldb.persistence.initialize",
        params,
        databaseName: `${databaseName}_${user}`
      });

      // Initialize collections for known resources
      await this.initializeCollections();

      // Check local log
      const localLog: ILocal = await this.select("kv:local");
      logger.info({
        at: "signaldb.persistence.initialize - local",
        localLog
      });

      if (!localLog?.id) {
        await this.addLocalLog(params);
        await this.updateDbo(params);
        return 0;
      }

      if (localLog.version && params?.appVersion) {
        logger.log({
          at: "signaldb.local - app version",
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
      logger.error({ at: "signaldb.persistence.initialize", err });
      return -1;
    }
  }

  private async initializeCollections() {
    const { Collection, OPFSAdapter } = await loadSignalDB();

    // Initialize collections for common resources
    const resourceTypes = [
      Resource.kv,
      Resource.collection,
      Resource.node,
      Resource.file,
      Resource.link,
      Resource.mutation,
      Resource.tz
    ];

    const databaseName = resolveDatabaseName(this.product);
    const baseAdapterName = `${databaseName}_${this.userId}`;

    for (const resource of resourceTypes) {
      // Create a separate OPFS adapter for each resource type to ensure data separation
      const resourceAdapter = new (OPFSAdapter as any)(
        `${baseAdapterName}_${resource}`
      );

      const collection = new Collection({
        memory: [],
        persistence: resourceAdapter
      });
      this.collections.set(resource, collection);
    }
  }

  private async getCollection(resource: string): Promise<any> {
    let collection = this.collections.get(resource);
    if (!collection) {
      // Create collection dynamically if it doesn't exist
      const { Collection, OPFSAdapter } = await loadSignalDB();

      // Create a separate OPFS adapter for this resource type
      const databaseName = resolveDatabaseName(this.product);
      const baseAdapterName = `${databaseName}_${this.userId}`;
      const resourceAdapter = new (OPFSAdapter as any)(
        `${baseAdapterName}_${resource}`
      );

      collection = new Collection({
        memory: [],
        persistence: resourceAdapter
      });
      this.collections.set(resource, collection);
    }
    return collection;
  }

  async reinitialize() {
    logger.debug({ at: "signaldb.persistence.reinitialize" });
    try {
      // Clear existing collections
      this.collections.clear();

      // Reinitialize collections with separate adapters
      await this.initializeCollections();
      return true;
    } catch (e) {
      logger.error({
        at: "signaldb.persistence.reinitialize - error",
        error: e
      });
      return false;
    }
  }

  terminate() {
    this.collections.clear();
    return Promise.resolve(true);
  }

  private async addLocalLog(params?: IPersistenceInitParams) {
    const kvCollection = await this.getCollection(Resource.kv);
    const localRecord = {
      id: "local",
      createdAt: new Date().toISOString(),
      version: params?.appVersion,
      isLocalMode: !params?.userId,
      dapId: params?.dapId
    };
    await kvCollection.insert(localRecord);
  }

  private async updateAppVersion(version: string) {
    const kvCollection = await this.getCollection(Resource.kv);
    await kvCollection.updateOne({ id: "local" }, { $set: { version } });
  }

  async mutation<T extends IResource | IMetaResource>(
    resource: Resource,
    params: IMutationParamsv2<T>
  ) {
    let response;
    switch (params.action) {
      case PersistenceActionType.CUSTOM:
        response = await this.query(params.query, params.data);
        break;
      case PersistenceActionType.INSERT:
        response = await this.insert<T>(params.records, resource);
        break;
      case PersistenceActionType.BULK_INSERT:
        response = await this.bulkInsert(resource, params.records);
        break;
      case PersistenceActionType.MERGE:
        response = await this.merge<T>(params.record);
        break;
      case PersistenceActionType.REPLACE:
        response = await this.replace<T>(params.record);
        break;
      case PersistenceActionType.DELETE:
        response = await this.delete(params.recordId);
        break;
      case PersistenceActionType.BULK_DELETE:
        response = await this.deleteMany(params.recordIds);
        break;
      case PersistenceActionType.BULK_MERGE:
        response = await this.bulkEdit<T>(resource, params.records);
        break;
    }
    return response;
  }

  async updateDbo(params?: IPersistenceInitParams) {
    logger.info({ at: "signaldb.persistence.updateDbo" });
    try {
      dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
        message: `Updating the app...`,
        subMessage: ""
      });

      // SignalDB doesn't require schema updates like SurrealDB
      // Just ensure collections are initialized
      await this.initializeCollections();

      logger.info({ at: "signaldb.persistence.updateDbo - completed" });
      return true;
    } catch (e) {
      logger.error({ at: "signaldb.persistence.updateDbo", e });
    } finally {
      dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
        message: "Update completed.",
        subMessage: "",
        isFinished: true
      });
    }
  }

  /**
   * Core CRUD operations
   */
  async insert<T extends IResource | IMetaResource>(
    records: T[],
    resource: string
  ): Promise<T[] | null> {
    const id = Math.random().toString(36).substring(2, 8);
    logger.log({
      at: "SignalDBPersistence.insert - " + id,
      resource,
      records
    });

    try {
      const collection = await this.getCollection(resource);

      const insertedRecords = [];
      for (const record of records) {
        try {
          // Check if document with this ID already exists
          const existing = await collection.findOne({ id: record.id });

          if (existing) {
            // Update existing document (upsert behavior)
            const result = await collection.updateOne(
              { id: record.id },
              { $set: record }
            );
            insertedRecords.push(record); // Return the updated record
          } else {
            // Insert new document
            const inserted = await collection.insert(record);
            insertedRecords.push(inserted);
          }
        } catch (individualError) {
          logger.error({
            at: "SignalDBPersistence.insert - individual record",
            recordId: record.id,
            error: individualError
          });
          // Continue with other records even if one fails
        }
      }

      logger.log({
        at: "SignalDBPersistence.insert - result",
        resource,
        records,
        result: insertedRecords
      });

      return insertedRecords;
    } catch (e: any) {
      logger.error({ at: "SignalDBPersistence.insert", message: e.message });
      return null;
    }
  }

  async bulkInsert(resource: string, records: any[]) {
    try {
      const collection = await this.getCollection(resource);

      const results = [];
      for (const record of records) {
        try {
          // Check if document with this ID already exists
          const existing = await collection.findOne({ id: record.id });

          if (existing) {
            // Update existing document
            const result = await collection.updateOne(
              { id: record.id },
              { $set: record }
            );
            results.push({ operation: "update", id: record.id, result });
          } else {
            // Insert new document
            const result = await collection.insert(record);
            results.push({ operation: "insert", id: record.id, result });
          }
        } catch (individualError) {
          logger.error({
            at: "SignalDBPersistence.bulkInsert - individual record",
            recordId: record.id,
            error: individualError
          });
          // Continue with other records even if one fails
          results.push({
            operation: "error",
            id: record.id,
            error: individualError
          });
        }
      }

      logger.debug({
        at: "SignalDBPersistence.bulkInsert",
        resource,
        totalRecords: records.length,
        results: results.length
      });

      return results;
    } catch (e) {
      logger.error({ at: "SignalDBPersistence.bulkInsert", e });
      return null;
    }
  }

  replace<T extends IResource | IMetaResource>(
    record: T
  ): Promise<any> | undefined {
    return this.merge(record);
  }

  async merge<T extends IResource | IMetaResource>(
    record: Partial<T>,
    params?: { isUpsert?: boolean }
  ): Promise<any> {
    logger.log({
      at: "SignalDBPersistence.merge",
      record
    });

    if (!record.id) return;

    try {
      // Extract resource type from id (e.g., "kv:local" -> "kv")
      const resourceType = record.id.toString().split(":")[0];
      const collection = await this.getCollection(resourceType);

      const existing = await collection.findOne({ id: record.id });
      let result;

      if (existing) {
        result = await collection.updateOne(
          { id: record.id },
          { $set: record }
        );
      } else if (params?.isUpsert !== false) {
        result = await collection.insert(record);
      }

      logger.log({
        at: "SignalDBPersistence.merge - result",
        record,
        result
      });

      return result;
    } catch (e: any) {
      logger.error({ at: "SignalDBPersistence.merge", message: e.message });
    }
    return null;
  }

  async delete(resourceId: IRecordId): Promise<any> {
    try {
      const resourceType = resourceId.toString().split(":")[0];
      const collection = await this.getCollection(resourceType);
      const result = await collection.deleteOne({ id: resourceId });

      logger.log({ at: "SignalDBPersistence.delete", resourceId, result });
      return result;
    } catch (e) {
      logger.error({ at: "SignalDBPersistence.delete", e });
    }
    return null;
  }

  async deleteMany(recordIds: IRecordId[]) {
    try {
      const resourceType = recordIds[0].toString().split(":")[0];
      const collection = await this.getCollection(resourceType);
      const result = await collection.deleteMany({
        id: { $in: recordIds }
      });

      logger.log({
        at: "SignalDBPersistence.deleteMany",
        resourceType,
        result
      });
      return result;
    } catch (e) {
      logger.error({ at: "SignalDBPersistence.deleteMany", e });
    }
    return null;
  }

  async bulkEdit<T extends IResource | IMetaResource>(
    resource: Resource,
    records: T[]
  ): Promise<any> {
    try {
      const collection = await this.getCollection(resource);

      const results = [];
      for (const record of records) {
        const result = await collection.updateOne(
          { id: record.id },
          { $set: record },
          { upsert: true }
        );
        results.push(result);
      }

      logger.log({
        at: "SignalDBPersistence.bulkEdit",
        resource,
        results
      });

      return results;
    } catch (e) {
      logger.error({ at: "SignalDBPersistence.bulkEdit", e });
    }
    return undefined;
  }

  async query(query: string, params: any): Promise<any> {
    try {
      // SignalDB doesn't use SQL-like queries
      // This would need to be adapted based on your query format
      logger.log({ at: "SignalDBPersistence.query", query, params });

      // For now, return null as custom queries would need specific implementation
      return null;
    } catch (e) {
      logger.error({ at: "SignalDBPersistence.query", e });
    }
    return null;
  }

  async select(
    resourceId: IRecordId,
    properties?: IResourceSelectProperties
  ): Promise<any> {
    try {
      const [resourceType, id] = resourceId.toString().split(":");
      const collection = await this.getCollection(resourceType);

      let result = await collection.findOne({ id });
      if (
        result &&
        properties &&
        properties.select &&
        properties.select.length > 0
      ) {
        const projected: any = { id: result.id };
        for (const prop of properties.select) {
          if (result[prop] !== undefined) {
            projected[prop] = result[prop];
          }
        }
        result = projected;
      }

      logger.log({
        at: "SignalDBPersistence.select",
        resourceId,
        properties,
        result
      });

      return result;
    } catch (e: any) {
      if (e instanceof Error && e.message === "Operation aborted") {
        logger.log({ at: "SignalDBPersistence.select - aborted", e });
        throw e;
      }
      logger.error({ at: "SignalDBPersistence.select", message: e.message });
    }
    return null;
  }

  async selectMany(
    resource: Resource,
    params?: IResourceSelectParams,
    signal?: AbortSignal
  ): Promise<any> {
    try {
      if (signal?.aborted) {
        throw new Error("Operation aborted");
      }

      const collection = await this.getCollection(resource);

      logger.debug({
        at: "SignalDBPersistence.selectMany - query",
        aborted: signal?.aborted,
        resource,
        params
      });

      // Build query filter
      let filter: any = {};
      if (params?.filters) {
        // Convert filters to MongoDB-style filter
        // This would need to be adapted based on your filters format
        filter = params.filters;
      }

      // Build query options
      const queryOptions: any = {};

      // Apply sorting
      if (params?.orderBy) {
        const sort: any = {};
        const orderByKeys = Object.keys(params.orderBy);
        for (const key of orderByKeys) {
          sort[key] = params.orderBy[key] === "asc" ? 1 : -1;
        }
        queryOptions.sort = sort;
      }

      // Apply limit
      if (params?.limit) {
        queryOptions.limit = params.limit;
      }

      // Apply offset
      if (params?.offset) {
        queryOptions.skip = params.offset;
      }

      // Execute query with options
      const query = collection.find(filter, queryOptions);
      const result = await query.fetch();

      logger.debug({
        at: "SignalDBPersistence.selectMany - result",
        aborted: signal?.aborted,
        resource,
        result,
        params
      });

      return result;
    } catch (e: any) {
      if (e instanceof Error && e.message === "Operation aborted") {
        logger.log({ at: "SignalDBPersistence.selectMany - aborted", e });
        throw e;
      }
      logger.error({
        at: "SignalDBPersistence.selectMany",
        message: e.message
      });
    }
    return null;
  }
}
