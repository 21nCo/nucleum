import type {
  ILocal,
  IPersistence,
  IPersistenceInitParams
} from "../persistence.type";
import { ResponseError, Surreal } from "surrealdb";
// import { surrealdbWasmEngines } from "@surrealdb/wasm";
// import { Surreal } from "surrealdb.js";
// import { surrealdbWasmEngines } from "surrealdb.wasm";
import { logger } from "../../components/debug/logger.client";
import {
  resolveDboUpdateQuery,
  commonQueryReplacements,
  resolveInsertQuery,
  resolveMergeQuery,
  resolveUpsertQuery,
  resolveBulkMergeQuery,
  resolveSelectQuery,
  resolveSelectManyQuery
} from "$lib/shared/utils/surreal.utils";
import { Resource } from "../../components/flux/resourceStores/resource.enum";
import type {
  IMetaResource,
  IResource
} from "../../components/flux/resourceStores/resource.type";
import {
  PersistenceActionType,
  SearchType,
  type IMutationParamsv2,
  type IPrimitiveDbDataType,
  type IRecordId,
  type IResourceSelectParams
} from "../../types/data.type";
import { interceptSurrealResponse } from "../../utils/utils";
import { LogType } from "$lib/client/components/debug/debug.type";
import { compareVersions } from "$lib/shared/utils/utils";
import { dispatchCustomEvent } from "$lib/client/utils/browser.utils";
import { GlobalEvent } from "$lib/client/types/event.enum";
import { generateMiniRandomId } from "$lib/shared/utils/crypto.utils";
import { Product } from "$lib/client/types/product.type";

const loadSurrealDB = async () => {
  const Surreal = await import("@surrealdb/wasm");
  return Surreal.surrealdbWasmEngines;
};

function resolveDatabaseId(product: Product) {
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

export class SurrealPersistence implements IPersistence {
  instance: Surreal | undefined = undefined;
  userId: string = "";
  product: Product = Product.NUCLEUS;
  private isProcessingOperation: boolean = false;
  private processId: string = "";
  private operationQueue: Array<{
    processId: string;
    resolve: () => void;
    reject: (reason?: any) => void;
    timestamp: number;
    signal?: AbortSignal;
  }> = [];
  constructor() {}

  /**
   * Asynchronously importing the wasm because of an issue that's being caused when running the app on Safari browser.
   * @param userId
   * @param params
   * @returns
   */
  async initialize(params: IPersistenceInitParams) {
    const user = params.userId ?? params.dapId;
    if (this.userId === user && this.instance) return -1;
    let engines;
    try {
      engines = await loadSurrealDB();
      // engines = await loadSurrealDBFromRemotev5(
      //   import.meta.env.VITE_STATIC_URL + "/surreal.zip"
      // );
      logger.info({ at: "surreal.persistence.initialize - wasm loaded" });
    } catch (e) {
      logger.error({
        at: "surreal.persistence.initialize - wasm load error",
        error: e,
        location: window.location.toString(),
        protocol: window.location.protocol
      });
    }
    if (!engines) return -1;
    this.instance = new Surreal({
      engines: engines({
        strict: false,
        capabilities: {
          guest_access: true,
          functions: true,
          network_targets: true
        }
      })
    });
    this.instance.emitter.subscribe("error", (event: any) => {
      logger.error({
        at: "surreal.persistence.emitter",
        event,
        str: JSON.stringify(event)
      });
    });
    this.userId = user;
    this.product = params.product as Product;
    try {
      logger.info({
        at: "surreal.persistence.initialize",
        params
      });
      await this.connectToDatabase();
      // await this.logInfo();
      // await this.testQuery();
      const localLog: ILocal = await this.select("kv:local");
      logger.info({
        at: "surreal.persistence.initialize - local",
        localLog
      });

      if (!localLog?.id) {
        await this.addLocalLog(params);
        await this.updateDbo(params);
        return 0;
      }

      if (localLog.version && params?.appVersion) {
        logger.log({
          at: "surreal.local - app version",
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
      logger.error({ at: "surreal.persistence.initialize", err });
      return -1;
    }
  }

  private async connectToDatabase() {
    const databaseId = resolveDatabaseId(this.product as Product);
    await this.instance?.connect(`indxdb://${databaseId}`);
    await this.instance?.use({ namespace: "user", database: this.userId });
  }

  async reinitialize() {
    logger.debug({ at: "surreal.persistence.reinitialize" });
    let engines;
    try {
      engines = await loadSurrealDB();
      // engines = await loadSurrealDBFromRemotev5(
      //   import.meta.env.VITE_STATIC_URL + "/surreal.zip"
      // );
      logger.info({ at: "surreal.persistence.reinitialize - wasm loaded" });
    } catch (e) {
      logger.error({
        at: "surreal.persistence.reinitialize - wasm load error",
        error: e,
        location: window.location.toString(),
        protocol: window.location.protocol
      });
    }
    if (!engines) return false;
    this.instance = new Surreal({
      engines: engines({
        strict: false,
        capabilities: {
          guest_access: true,
          functions: true,
          network_targets: true
        }
      })
    });
    await this.connectToDatabase();
    return true;
  }

  terminate() {
    this.clearQueue();
    return this.instance?.close() ?? Promise.resolve(true);
  }

  private async addLocalLog(params?: IPersistenceInitParams) {
    await this.awaiter();
    const result = await this.instance?.query(
      `INSERT INTO kv { id: 'local', createdAt: time::now(), version: "${
        params?.appVersion
      }", isLocalMode: ${!params?.userId}, dapId: "${params?.dapId}" };`
    );
    this.finishOperation();
  }

  private async updateAppVersion(version: string) {
    await this.awaiter();
    const result = await this.instance?.query(
      `UPDATE kv:local SET version = "${version}";`
    );
    this.finishOperation();
  }

  private async logInfo() {
    await this.awaiter();
    const info = await this.instance?.query("INFO FOR NS; INFO FOR DATABASE;");
    logger.log({
      at: "surreal.persistence.logInfo",
      userId: this.userId,
      info
    });
    this.finishOperation();
  }
  private async testQuery() {
    await this.awaiter();
    const result = await this.instance?.query(
      // "select * from mutation; select * from kv; select * from tz;"
      "select * from collection;"
    );
    logger.log(
      {
        at: "surreal.persistence.testQuery",
        userId: this.userId,
        result
      },
      LogType.DEBUG
    );
    this.finishOperation();
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
        response = await this._insert(resource, params.records);
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
        // response = await this.bulkEdit<T>(resource, params.records);
        response = await this.bulkEditTemp<T>(resource, params.records);
        break;
    }
    return response;
  }

  /**
   * Updates the database with dbo definitions.
   */
  async updateDbo(params?: IPersistenceInitParams) {
    logger.info({ at: "surreal.persistence.updateDbo" });
    try {
      await this.awaiter();
      dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
        message: `Updating the app...`,
        subMessage: ""
      });
      const dependencies = params?.dbo;
      if (!dependencies) return;
      const query = resolveDboUpdateQuery(dependencies);
      const result = await this.instance?.query(query);
      logger.info({ at: "surreal.persistence.updateDbo", query, result });
      return result;
    } catch (e) {
      logger.error({ at: "surreal.persistence.updateDbo", e });
    } finally {
      dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
        message: "Update completed.",
        subMessage: "",
        isFinished: true
      });
      this.finishOperation();
    }
  }

  /**
   * Using this to prevent multiple operations on the database at the same time which is causing errors.
   * Implements a FIFO queue system to ensure operations are processed in order.
   * @returns
   */
  private awaiter(processId?: string, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if signal is already aborted
      if (signal?.aborted) {
        reject(new Error("Operation aborted"));
        return;
      }

      const operation = {
        processId: processId ?? "unknown",
        resolve,
        reject,
        timestamp: Date.now(),
        signal
      };

      // Add abort listener if signal is provided
      if (signal) {
        const abortHandler = () => {
          // Remove from queue if still waiting
          const index = this.operationQueue.indexOf(operation);
          if (index !== -1) {
            this.operationQueue.splice(index, 1);
            reject(new Error("Operation aborted"));
          }
          signal.removeEventListener("abort", abortHandler);
        };
        signal.addEventListener("abort", abortHandler);
      }

      this.operationQueue.push(operation);
      this.processQueue();
    });
  }

  /**
   * Processes the operation queue in FIFO order
   */
  private processQueue() {
    if (this.isProcessingOperation || this.operationQueue.length === 0) {
      return;
    }

    const operation = this.operationQueue.shift()!;

    // Check if operation is aborted before processing
    if (operation.signal?.aborted) {
      operation.reject(new Error("Operation aborted"));
      this.processQueue(); // Continue with next operation
      return;
    }

    this.isProcessingOperation = true;
    this.processId = operation.processId;

    logger.log({
      at: "awaiter - starting process",
      processId: this.processId,
      queueLength: this.operationQueue.length,
      waitTime: Date.now() - operation.timestamp
    });

    operation.resolve();
  }

  /**
   * Finishes the current operation and processes the next one in the queue
   */
  private finishOperation() {
    this.isProcessingOperation = false;
    this.processQueue(); // Process next operation in queue
  }

  /**
   * Clears the operation queue (useful for cleanup or error recovery)
   */
  private clearQueue() {
    logger.debug({
      at: "clearQueue",
      queueLength: this.operationQueue.length
    });
    this.operationQueue = [];
    this.isProcessingOperation = false;
  }

  /**
   *
   *
   * Note: Using `.insert` method surreal.js directly would result in surreal-wasm not recognizing record links.
   *
   * Workaround to use .insert would be to use type::thing() transform for record links
   *
   * For files, insert is used as files contain bytes data type.
   *
   *
   * "@surrealdb/wasm": "^1.0.1"
   * Not using this._insert(resource, records, { isUpsert: true }) - as UPSERT is throwing error if record already present instead of directly updating if present (unlike Remote). Instead using upsertFallback to handle this.
   *
   *
   * @param records - records to be inserted
   * @param resource - resource i.e. table name
   * @returns
   */
  async insert<T extends IResource | IMetaResource>(
    records: T[],
    resource: string
  ): Promise<T[] | null> {
    const id = Math.random().toString(36).substring(2, 8);
    logger.log({
      at: "SurrealPersistence.insert - " + id,
      resource,
      records,
      isProcessingOperation: this.isProcessingOperation,
      processId: this.processId
    });
    try {
      await this.awaiter("insert" + resource + id);
      let result;
      if (resource === Resource.file && records[0].data) {
        result = await this.instance?.insert<T>(resource, records);
        logger.log({ at: "SurrealPersistence.insert", resource, result });
        this.finishOperation();
        return result ?? null;
      } else if (resource === Resource.link) {
        result = await this._insert(resource, records, { isRelation: true });
      } else {
        // result = await this._insert(resource, records, { isUpsert: true });
        result = await this.upsertFallback(resource, records);
      }
      logger.log({
        at: "SurrealPersistence.insert - result",
        resource,
        records,
        result
      });
      if (Array.isArray(result) && result[0] && Array.isArray(result[0]))
        return result[0];
      else return null;
    } catch (e: any) {
      logger.error({ at: "SurrealPersistence.insert", message: e.message });
    }
    return null;
  }

  /**
   * Upserts one by one and updates on error if record already exists. Bulk upsert doesn't work either on surreal-wasm or on remote to bulk insert with update as fallback.
   *
   * UPSERT throws ResponseError if the record already exists.
   *
   * "@surrealdb/wasm": "^1.0.1"
   * "surrealdb": "^1.0.6"
   *
   * @param resource
   * @param records
   * @returns
   */
  async upsertFallback(resource: string, records: any[]) {
    logger.log({
      at: "SurrealPersistence.upsertRecordsFallback",
      resource,
      records
    });
    try {
      for (const record of records) {
        let recordId;
        try {
          const { query, id } = resolveUpsertQuery(
            resource as Resource,
            record
          );
          recordId = id;
          await this.instance?.query(query);
        } catch (e) {
          logger.log({
            at: `SurrealPersistence.upsert - ${recordId} - record already exists. Updating instead.`,
            record,
            e,
            recordId
          });
          if (e instanceof ResponseError) {
            const query = resolveMergeQuery({ ...record, id: recordId });
            await this.instance?.query(query);
          }
        }
      }
      return [records];
    } catch (e: any) {
      logger.error({ at: "SurrealPersistence.upsert", message: e.message });
    } finally {
      this.finishOperation();
    }
  }

  async _insert(
    resource: string,
    records: any[],
    params?: { isUpsert?: boolean; isRelation?: boolean }
  ) {
    try {
      const query = resolveInsertQuery(resource as Resource, records, params);
      const result = await this.instance?.query(query);
      return result;
    } catch (e) {
      logger.error({ at: "SurrealPersistence.bulkInsert", e });
    } finally {
      this.finishOperation();
    }
    return null;
  }

  replace<T extends IResource | IMetaResource>(
    record: T
  ): Promise<any> | undefined {
    return this.instance?.update(record.id, record);
  }

  /**
   *
   *
   * surreal-wasm: "^1.0.1"
   * Using upsert (with MERGE) is failing with error: There was a problem with a datastore transaction: An IndexedDB error occured: failed to execute indexed db request: ConstraintError: Key already exists in the object store
   *
   * Example: UPSERT kv:local MERGE {"lastSyncUp":1730197613587};
   *
   * Using where clause like UPSERT kv MERGE {"lastSyncUp":1730197613587} where id = "kv:local"; works fine but doesn't do the job of upsert i.e. insert record if not present.
   *
   * Using simple update instead of upsert and a insert fallback.
   * On remote - using UPSERT directly.
   *
   *
   * @param record
   * @returns
   */
  async merge<T extends IResource | IMetaResource>(
    record: Partial<T>,
    params?: { isUpsert?: boolean }
  ): Promise<any> {
    logger.log({
      at: "SurrealPersistence.merge",
      record,
      isProcessingOperation: this.isProcessingOperation,
      processId: this.processId
    });
    if (!record.id) return;
    try {
      await this.awaiter("merge_" + record.id);
      const query = resolveMergeQuery(record, params);
      logger.log({ at: "SurrealPersistence.merge - query", record, query });
      const result = await this.instance?.query(query);
      logger.log({
        at: "SurrealPersistence.merge - result",
        record,
        query,
        result
      });
      if (
        result &&
        Array.isArray(result) &&
        (!result[0] || (Array.isArray(result[0]) && result[0].length === 0))
      ) {
        const resource = record.id.toString().split(":")[0];
        const insertQuery = resolveInsertQuery(resource as Resource, [record]);
        logger.log({
          at: "SurrealPersistence.merge - record not present, fallback to insert",
          record,
          insertQuery
        });
        const insertResult = await this.instance?.query(insertQuery);
        logger.log({
          at: "SurrealPersistence.merge - insert fallback result",
          insertResult
        });
        return insertResult;
      }
      return result;
    } catch (e: any) {
      logger.error({ at: "SurrealPersistence.merge", message: e.message });
    } finally {
      this.finishOperation();
      logger.log({
        at: "SurrealPersistence.merge - finally",
        isProcessingOperation: this.isProcessingOperation
      });
    }
    return null;
  }

  /**
   * @param resourceId
   * @returns
   *
   * Notes:
   * SDK method .delete() is not functioning.
   * "surrealdb": "^1.0.6"
   *  "@surrealdb/wasm": "^1.0.1"
   *
   */
  async delete(resourceId: IRecordId): Promise<any> {
    try {
      await this.awaiter("delete_" + resourceId);
      // const result = await this.instance?.delete(resourceId.toString());
      const result = await this.instance?.query(`DELETE ${resourceId};`);
      logger.log({ at: "SurrealPersistence.delete", resourceId, result });
      return result;
    } catch (e) {
      logger.error({ at: "SurrealPersistence.delete", e });
    } finally {
      this.finishOperation();
    }
    return null;
  }

  async deleteMany(recordIds: IRecordId[]) {
    try {
      const resource = recordIds[0].toString().split(":")[0];
      await this.awaiter("deleteMany_" + resource);
      // const result = await this.instance?.delete(resourceId.toString());
      const result = await this.instance?.query(
        `DELETE ${resource} WHERE id in [${recordIds
          .map((x) => `${x}`)
          .join(",")}];`
      );
      logger.log({ at: "SurrealPersistence.deleteMany", resource, result });
      return result;
    } catch (e) {
      logger.error({ at: "SurrealPersistence.delete", e });
    } finally {
      this.finishOperation();
    }
    return null;
  }

  /**
   * Bulk merge or update is only available since Surreal 2.0.0.
   *
   * Until the wasm binary is updated, this method won't work. Use bulkEditTemp workaround for now.
   */
  bulkEdit<T extends IResource | IMetaResource>(
    resource: Resource,
    records: T[]
  ): Promise<any> | undefined {
    return this.instance?.query(`UPDATE ${resource} MERGE $resources;`, {
      resources: records
    });
  }

  async bulkEditTemp<T extends IResource | IMetaResource>(
    resource: Resource,
    records: T[]
  ): Promise<any> {
    try {
      await this.awaiter("bulkEditTemp_" + resource);
      const query = resolveBulkMergeQuery(resource, records);
      logger.log({
        at: "SurrealPersistence.bulkEditTemp",
        resource,
        query
      });
      const result = await this.instance?.query(query);
      logger.log({
        at: "SurrealPersistence.bulkEditTemp - result",
        resource,
        query,
        result
      });
      return result;
    } catch (e) {
      logger.error({ at: "SurrealPersistence.bulkEditTemp", e });
    } finally {
      this.finishOperation();
    }
    return undefined;
  }

  async query(query: string, params: any): Promise<any> {
    // return this.instance?.query(query, params);
    try {
      await this.awaiter("query_" + query);
      query = commonQueryReplacements(query);
      const result = await this.instance?.query_raw(query, params);
      logger.log({ at: "SurrealPersistence.query", query, params, result });
      return interceptSurrealResponse(result);
    } catch (e) {
      logger.error({ at: "SurrealPersistence.query", e });
    } finally {
      this.finishOperation();
    }
    return null;
  }

  /**
   *
   * Using query_raw instead of query as the util function `interceptSurrealResponse` works with raw response - which is the default on http based Surreal API calls.
   *
   * @param resourceId
   * @param properties
   * @param signal
   * @returns
   */
  async select(
    resourceId: IRecordId,
    properties?: string[],
    signal?: AbortSignal
  ): Promise<any> {
    try {
      // Check if operation was aborted before starting
      if (signal?.aborted) {
        throw new Error("Operation aborted");
      }

      await this.awaiter("select_" + resourceId, signal);

      // Check if operation was aborted after awaiter
      if (signal?.aborted) {
        throw new Error("Operation aborted");
      }

      const query = resolveSelectQuery(resourceId, properties);
      const logResource: Resource = Resource.everything;
      if (resourceId.toString().includes(logResource)) {
        logger.debug({ at: "SurrealPersistence.select", query, resourceId });
        console.time(
          `SurrealPersistence.select - ${logResource} - ${resourceId}`
        );
      }
      const result = await this.queryRawWithSignal(query, undefined, signal);
      if (resourceId.toString().includes(logResource)) {
        console.timeEnd(
          `SurrealPersistence.select - ${logResource} - ${resourceId}`
        );
        logger.debug({ at: "SurrealPersistence.select - result", result });
      }
      return interceptSurrealResponse(result);
    } catch (e: any) {
      if (e instanceof Error && e.message === "Operation aborted") {
        logger.log({ at: "SurrealPersistence.select - aborted", e });
        throw e;
      }
      logger.error({ at: "SurrealPersistence.select", message: e.message });
    } finally {
      this.finishOperation();
    }
    return null;
  }

  /**
   * Wraps queryRaw with abort signal support using Promise.race
   * @param query - The query to execute
   * @param params - Query parameters
   * @param signal - AbortSignal to cancel the operation
   * @returns Promise that resolves with query result or rejects if aborted
   */
  private async queryRawWithSignal(
    query: string,
    params?: any,
    signal?: AbortSignal
  ): Promise<any> {
    if (!this.instance) {
      throw new Error("Database instance not available");
    }

    // If no signal provided, just execute normally
    if (!signal) {
      return this.instance.queryRaw(query, params);
    }

    // If already aborted, reject immediately
    if (signal.aborted) {
      throw new Error("Operation aborted");
    }

    // Create abort promise that rejects when signal is aborted
    const abortPromise = new Promise((_, reject) => {
      const abortHandler = () => {
        signal.removeEventListener("abort", abortHandler);
        reject(new Error("Operation aborted"));
      };
      signal.addEventListener("abort", abortHandler);
    });

    // Race between the query and abort signal
    return Promise.race([this.instance.queryRaw(query, params), abortPromise]);
  }

  async selectMany(
    resource: Resource,
    params?: IResourceSelectParams,
    signal?: AbortSignal
  ): Promise<any> {
    try {
      // Check if operation was aborted before starting
      if (signal?.aborted) {
        throw new Error("Operation aborted");
      }

      await this.awaiter("selectMany_" + resource, signal);

      // Check if operation was aborted after awaiter
      if (signal?.aborted) {
        throw new Error("Operation aborted");
      }

      const query = resolveSelectManyQuery(resource, params);
      const instance = generateMiniRandomId();
      const logResources: Resource[] = [];
      if (logResources.includes(resource)) {
        logger.debug({
          at: "SurrealPersistence.selectMany - query",
          aborted: signal?.aborted,
          resource,
          query,
          params
        });
        console.time(
          `SurrealPersistence.selectMany - ${resource} - ${instance}`
        );
      }
      const result = await this.queryRawWithSignal(query, params, signal);
      if (logResources.includes(resource)) {
        console.timeEnd(
          `SurrealPersistence.selectMany - ${resource} - ${instance}`
        );
        logger.debug({
          at: "SurrealPersistence.selectMany - result",
          aborted: signal?.aborted,
          resource,
          result,
          query,
          params
        });
      }
      return interceptSurrealResponse(result);
    } catch (e: any) {
      if (e instanceof Error && e.message === "Operation aborted") {
        logger.log({ at: "SurrealPersistence.selectMany - aborted", e });
        throw e;
      } else {
        logger.error({
          at: "SurrealPersistence.selectMany",
          message: e.message
        });
      }
    } finally {
      this.finishOperation();
    }
    return null;
  }
}
