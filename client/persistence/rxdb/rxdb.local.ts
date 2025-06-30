import type {
  ILocal,
  IPersistence,
  IPersistenceInitParams
} from "../persistence.type";
import { logger } from "../../components/debug/logger.client";
import { Resource } from "../../components/flux/resourceStores/resource.enum";
import type {
  IMetaResource,
  IResource
} from "../../components/flux/resourceStores/resource.type";
import {
  PersistenceActionType,
  type IMutationParamsv2,
  type IRecordId,
  type IResourceSelectParams
} from "../../types/data.type";
import { LogType } from "$lib/client/components/debug/debug.type";
import { compareVersions } from "$lib/shared/utils/utils";
import { dispatchCustomEvent } from "$lib/client/utils/browser.utils";
import { GlobalEvent } from "$lib/client/types/event.enum";
import { generateMiniRandomId } from "$lib/shared/utils/crypto.utils";
import { Product } from "$lib/client/types/product.type";

const loadRxDB = async () => {
  const { createRxDatabase } = await import("rxdb");
  const { getRxStorageDexie } = await import("rxdb/plugins/storage-dexie");
  const { RxDBQueryBuilderPlugin } = await import("rxdb/plugins/query-builder");
  return {
    createRxDatabase,
    getRxStorageDexie,
    RxDBQueryBuilderPlugin
  };
};

function resolveDatabaseName(product: Product) {
  if (!product) return "nativeone";
  switch (product) {
    case Product.POINTRON:
      return "pointone";
    case Product.MEMOTRON:
      return "nativeone";
    default:
      return "nativeone";
  }
}

const resourceSchema = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100
    },
    createdAt: {
      type: "string"
    },
    updatedAt: {
      type: "string"
    }
  },
  required: ["id"],
  additionalProperties: true
};

export class RxDBPersistence implements IPersistence {
  private database: any = undefined;
  private collections: Map<string, any> = new Map();
  userId: string = "";
  product: Product = Product.NUCLEUS;

  constructor() {}

  async initialize(params: IPersistenceInitParams) {
    const user = params.userId ?? params.dapId;
    if (this.userId === user && this.database) return -1;

    try {
      const { createRxDatabase, getRxStorageDexie, RxDBQueryBuilderPlugin } =
        await loadRxDB();

      const databaseName = resolveDatabaseName(this.product);

      this.database = await createRxDatabase({
        name: `${databaseName}_${user}`,
        storage: getRxStorageDexie(),
        multiInstance: false,
        ignoreDuplicate: true
      });

      this.userId = user;
      this.product = params.product as Product;

      logger.info({
        at: "rxdb.persistence.initialize",
        params,
        databaseName: `${databaseName}_${user}`
      });

      await this.initializeCollections();

      const localLog: ILocal = await this.select("kv:local");
      logger.info({
        at: "rxdb.persistence.initialize - local",
        localLog
      });

      if (!localLog?.id) {
        await this.addLocalLog(params);
        await this.updateDbo(params);
        return 0;
      }

      if (localLog.version && params?.appVersion) {
        logger.log({
          at: "rxdb.local - app version",
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
      logger.error({ at: "rxdb.persistence.initialize", err });
      return -1;
    }
  }

  private async initializeCollections() {
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
      try {
        const collection = await this.database.addCollections({
          [resource]: {
            schema: resourceSchema
          }
        });
        this.collections.set(resource, collection[resource]);
      } catch (error) {
        logger.error({ at: "rxdb.initializeCollections", resource, error });
      }
    }
  }

  private async getCollection(resource: string): Promise<any> {
    let collection = this.collections.get(resource);
    if (!collection && this.database) {
      try {
        const newCollections = await this.database.addCollections({
          [resource]: {
            schema: resourceSchema
          }
        });
        collection = newCollections[resource];
        this.collections.set(resource, collection);
      } catch (error) {
        logger.error({ at: "rxdb.getCollection", resource, error });
      }
    }
    return collection;
  }

  async reinitialize() {
    logger.debug({ at: "rxdb.persistence.reinitialize" });
    try {
      if (this.database) {
        await this.database.destroy();
      }
      this.collections.clear();
      this.database = undefined;
      return true;
    } catch (e) {
      logger.error({
        at: "rxdb.persistence.reinitialize - error",
        error: e
      });
      return false;
    }
  }

  async terminate() {
    try {
      if (this.database) {
        await this.database.destroy();
      }
      this.collections.clear();
      this.database = undefined;
      return true;
    } catch (error) {
      logger.error({ at: "rxdb.terminate", error });
      return false;
    }
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
    const localDoc = await kvCollection.findOne("local").exec();
    if (localDoc) {
      await localDoc.update({
        $set: {
          version: version,
          updatedAt: new Date().toISOString()
        }
      });
    }
  }

  async mutation<T extends IResource | IMetaResource>(
    resource: Resource,
    params: IMutationParamsv2<T>
  ) {
    try {
      const collection = await this.getCollection(resource);
      if (!collection) {
        logger.error({
          at: "rxdb.mutation",
          error: "Collection not found",
          resource
        });
        return;
      }

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
            at: "rxdb.mutation",
            message: "Custom action not implemented"
          });
          return;
      }
    } catch (error) {
      logger.error({ at: "rxdb.mutation", resource, params, error });
    }
  }

  async updateDbo(params?: IPersistenceInitParams) {
    try {
      const kvCollection = await this.getCollection(Resource.kv);
      const dboRecord = {
        id: "dbo",
        value: params?.dbo ?? [],
        createdAt: new Date().toISOString()
      };

      const existingDoc = await kvCollection.findOne("dbo").exec();
      if (existingDoc) {
        await existingDoc.update({
          $set: {
            value: dboRecord.value,
            updatedAt: new Date().toISOString()
          }
        });
      } else {
        await kvCollection.insert(dboRecord);
      }
    } catch (error) {
      logger.error({ at: "rxdb.updateDbo", error });
    }
  }

  async insert<T extends IResource | IMetaResource>(
    records: T[],
    resource: string
  ): Promise<T[] | null> {
    try {
      const collection = await this.getCollection(resource);
      if (!collection) return null;

      const insertedDocs = [];
      for (const record of records) {
        try {
          const doc = await collection.insert(record);
          insertedDocs.push(doc.toJSON());
        } catch (error: any) {
          if (error.code === "CONFLICT") {
            const existingDoc = await collection.findOne(record.id).exec();
            if (existingDoc) {
              await existingDoc.update({
                $set: {
                  ...record,
                  updatedAt: new Date().toISOString()
                }
              });
              insertedDocs.push(existingDoc.toJSON());
            }
          } else {
            throw error;
          }
        }
      }
      return insertedDocs;
    } catch (error) {
      logger.error({ at: "rxdb.insert", error, resource });
      return null;
    }
  }

  async bulkInsert(resource: string, records: any[]) {
    try {
      const collection = await this.getCollection(resource);
      if (!collection) return;

      const results = [];
      for (const record of records) {
        try {
          const doc = await collection.upsert(record);
          results.push(doc.toJSON());
        } catch (error) {
          logger.error({ at: "rxdb.bulkInsert", error, record });
        }
      }
      return results;
    } catch (error) {
      logger.error({ at: "rxdb.bulkInsert", error, resource });
    }
  }

  replace<T extends IResource | IMetaResource>(
    record: T
  ): Promise<any> | undefined {
    return this.merge(record, { isUpsert: true });
  }

  async merge<T extends IResource | IMetaResource>(
    record: Partial<T>,
    params?: { isUpsert?: boolean }
  ): Promise<any> {
    try {
      const resourceName = this.resolveResource(record.id as IRecordId);
      const collection = await this.getCollection(resourceName);
      if (!collection) return;

      const existingDoc = await collection.findOne(record.id).exec();
      if (existingDoc) {
        return await existingDoc.update({
          $set: {
            ...record,
            updatedAt: new Date().toISOString()
          }
        });
      } else if (params?.isUpsert) {
        return await collection.insert({
          ...record,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error({ at: "rxdb.merge", error, record });
    }
  }

  async delete(resourceId: IRecordId): Promise<any> {
    try {
      const resourceName = this.resolveResource(resourceId);
      const collection = await this.getCollection(resourceName);
      if (!collection) return;

      const doc = await collection.findOne(resourceId).exec();
      if (doc) {
        return await doc.remove();
      }
    } catch (error) {
      logger.error({ at: "rxdb.delete", error, resourceId });
    }
  }

  async deleteMany(recordIds: IRecordId[]) {
    try {
      const groupedIds = new Map<string, string[]>();

      for (const id of recordIds) {
        const resourceName = this.resolveResource(id);
        if (!groupedIds.has(resourceName)) {
          groupedIds.set(resourceName, []);
        }
        groupedIds.get(resourceName)?.push(String(id));
      }

      const results = [];
      for (const [resourceName, ids] of groupedIds) {
        const collection = await this.getCollection(resourceName);
        if (collection) {
          const docs = await collection
            .find({
              selector: {
                id: { $in: ids }
              }
            })
            .exec();

          for (const doc of docs) {
            await doc.remove();
          }
          results.push({ resource: resourceName, deleted: docs.length });
        }
      }
      return results;
    } catch (error) {
      logger.error({ at: "rxdb.deleteMany", error, recordIds });
    }
  }

  async bulkEdit<T extends IResource | IMetaResource>(
    resource: Resource,
    records: T[]
  ): Promise<any> {
    try {
      const collection = await this.getCollection(resource);
      if (!collection) return;

      const results = [];
      for (const record of records) {
        const result = await this.merge(record, { isUpsert: true });
        results.push(result);
      }
      return results;
    } catch (error) {
      logger.error({ at: "rxdb.bulkEdit", error, resource });
    }
  }

  async query(query: string, params: any): Promise<any> {
    try {
      const collection = await this.getCollection(query);
      if (!collection) return;

      if (typeof params === "string") {
        const doc = await collection.findOne(params).exec();
        return doc ? doc.toJSON() : null;
      }

      const docs = await collection
        .find({
          selector: params
        })
        .exec();

      return docs.map((doc: any) => doc.toJSON());
    } catch (error) {
      logger.error({ at: "rxdb.query", error, query, params });
    }
  }

  async select(
    resourceId: IRecordId,
    properties?: string[],
    signal?: AbortSignal
  ): Promise<any> {
    try {
      const resourceName = this.resolveResource(resourceId);
      const collection = await this.getCollection(resourceName);
      if (!collection) return;

      const doc = await collection.findOne(resourceId).exec();
      if (!doc) return null;

      const result = doc.toJSON();
      if (properties && properties.length > 0) {
        const filtered: any = {};
        for (const prop of properties) {
          if (result[prop] !== undefined) {
            filtered[prop] = result[prop];
          }
        }
        return filtered;
      }

      return result;
    } catch (error) {
      logger.error({ at: "rxdb.select", error, resourceId });
    }
  }

  async selectMany(
    resource: Resource,
    params?: IResourceSelectParams,
    signal?: AbortSignal
  ): Promise<any> {
    try {
      const collection = await this.getCollection(resource);
      if (!collection) return [];

      let query = collection.find();

      if (params?.filters) {
        if ("condition" in params.filters) {
          query = this.applyFilterGroup(query, params.filters);
        } else {
          query = this.applyFilters(query, params.filters);
        }
      }

      if (params?.search) {
        query = this.applySearch(query, params.search);
      }

      if (params?.orderBy) {
        query = this.applyOrderBy(query, params.orderBy);
      }

      if (params?.offset) {
        query = query.skip(params.offset);
      }

      if (params?.limit) {
        query = query.limit(params.limit);
      }

      const docs = await query.exec();
      return docs.map((doc: any) => doc.toJSON());
    } catch (error) {
      logger.error({ at: "rxdb.selectMany", error, resource, params });
      return [];
    }
  }

  private applyFilters(query: any, filters: { [key: string]: any }): any {
    const selector: any = {};
    for (const [key, value] of Object.entries(filters)) {
      selector[key] = value;
    }
    return query.where(selector);
  }

  private applyFilterGroup(query: any, filterGroup: any): any {
    return query;
  }

  private applySearch(
    query: any,
    search: { query: string; properties?: string[]; isCaseSensitive?: boolean }
  ): any {
    const searchRegex = new RegExp(
      search.query,
      search.isCaseSensitive ? "g" : "gi"
    );

    if (search.properties && search.properties.length > 0) {
      const orConditions = search.properties.map((prop) => ({
        [prop]: { $regex: searchRegex }
      }));
      return query.where({ $or: orConditions });
    }

    return query;
  }

  private applyOrderBy(
    query: any,
    orderBy: { [key: string]: "asc" | "desc" }
  ): any {
    for (const [key, direction] of Object.entries(orderBy)) {
      query = query.sort({ [key]: direction === "asc" ? 1 : -1 });
    }
    return query;
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
