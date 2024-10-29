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
  resolveUpsertQuery
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
import { TacoActions } from "$lib/client/types/taco.types";
import { tacoWorker } from "$lib/client/products/memotron/memotron.utils";

const loadSurrealDB = async () => {
  const Surreal = await import("@surrealdb/wasm");
  return Surreal.surrealdbWasmEngines;
};

export class SurrealPersistence implements IPersistence {
  instance: Surreal | undefined = undefined;
  userId: string = "";
  queryEmbedding: Float32Array[] | null = null;
  private isProcessingOperation: boolean = false;
  private processId: string = "";
  private waitingTimeElapsed: number = 0;
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
      logger.log({ at: "surreal.persistence.initialize - wasm loaded" });
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
    this.userId = user;
    try {
      logger.log({ at: "surreal.persistence.initialize", user });
      await this.instance.connect("indxdb://blank");
      await this.instance.use({ namespace: "user", database: this.userId });

      // await this.logInfo();
      // await this.testQuery();
      const localLog: ILocal = await this.select("kv:local");
      logger.log({
        at: "surreal.persistence.initialize - localLog",
        localLog
      });

      if (!localLog?.id) {
        await this.addLocalLog(params);
        await this.updateDbo(params);
        return 0;
      }

      if (localLog.version && params?.appVersion) {
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

  private async addLocalLog(params?: IPersistenceInitParams) {
    await this.awaiter();
    const result = await this.instance?.query(
      `INSERT INTO kv { id: 'local', createdAt: time::now(), version: "${params?.appVersion}", isLocalMode: ${!params?.userId}, dapId: "${params?.dapId}" };`
    );
    this.isProcessingOperation = false;
  }

  private async updateAppVersion(version: string) {
    await this.awaiter();
    const result = await this.instance?.query(
      `UPDATE kv:local SET version = "${version}";`
    );
    this.isProcessingOperation = false;
  }

  private async logInfo() {
    await this.awaiter();
    const info = await this.instance?.query("INFO FOR NS; INFO FOR DATABASE;");
    logger.log({
      at: "surreal.persistence.logInfo",
      userId: this.userId,
      info
    });
    this.isProcessingOperation = false;
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
    this.isProcessingOperation = false;
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
        response = await this.bulkInsert(resource, params.records, {
          isUpsert: false
        });
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
    logger.log({ at: "surreal.persistence.updateDbo" });
    await this.awaiter();
    const dependencies = params?.dbo;
    if (!dependencies) return;
    const query = resolveDboUpdateQuery(dependencies);
    const result = await this.instance?.query(query);
    logger.log({ at: "surreal.persistence.updateDbo", query, result });
    this.isProcessingOperation = false;
    return result;
  }

  /**
   * Using this to prevent multiple operations on the database at the same time which is causing errors.
   * @returns
   */
  private awaiter(processId?: string) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        this.waitingTimeElapsed += 100;
        if (!this.isProcessingOperation || this.waitingTimeElapsed > 4000) {
          clearInterval(interval);
          this.isProcessingOperation = true;
          this.processId = processId ?? "unknown";
          logger.log({
            at: "awaiter - starting process",
            processId: this.processId,
            waitingTimeElapsed: this.waitingTimeElapsed
          });
          this.waitingTimeElapsed = 0;
          resolve(true);
        }
      }, 100);
    });
  }

  /**
   *
   *
   * Note: Using `.insert` method surreal.js directly would result in surreal-wasm not recognizing record links. Also, using quert would remove the need for generating query anyways for `delegateSync`.
   *
   * Workaround to use .insert would be to use type::thing() transform for record links
   *
   * For files, insert is used as files contain bytes data type.
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
        this.isProcessingOperation = false;
        return result ?? null;
      } else if (resource === Resource.link) {
        result = await this.bulkInsert(resource, records, { isRelation: true });
      } else {
        // result = await this.bulkInsert(resource, records);
        result = await this.upsertRecordsFallback(resource, records);
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
    } catch (e) {
      logger.error({ at: "SurrealPersistence.insert", e });
    }
    return null;
  }

  /**
   * Using UPSERT is still throwing error for Surreal wasm engine. hence this fallback.
   *
   * "@surrealdb/wasm": "^1.0.1"
   * "surrealdb": "^1.0.6"
   *
   * TODO - watch - unexpected cases because of use of this.isProcessingOperation inside this operation.
   *
   * @param resource
   * @param records
   * @returns
   */
  async upsertRecordsFallback(resource: string, records: any[]) {
    logger.log({
      at: "SurrealPersistence.upsertRecordsFallback",
      resource,
      records
    });
    try {
      for (const record of records) {
        let recordId;
        try {
          const { query, id } = resolveUpsertQuery(resource, record);
          recordId = id;
          await this.instance?.query(query);
        } catch (e) {
          logger.log({
            at: `SurrealPersistence.upsertRecordsFallback - failed upsert for record`,
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
    } catch (e) {
      logger.error({ at: "SurrealPersistence.upsertRecordsFallback", e });
    } finally {
      this.isProcessingOperation = false;
    }
  }

  async bulkInsert(
    resource: string,
    records: any[],
    params: { isUpsert?: boolean; isRelation?: boolean }
  ) {
    try {
      const query = resolveInsertQuery(resource, records, params);
      const result = await this.instance?.query(query);
      return result;
    } catch (e) {
      logger.error({ at: "SurrealPersistence.bulkInsert", e });
    } finally {
      this.isProcessingOperation = false;
    }
    return null;
  }

  replace<T extends IResource | IMetaResource>(
    record: T
  ): Promise<any> | undefined {
    return this.instance?.update(record.id, record);
  }

  /**
   * @param record
   * @returns
   */
  async merge<T extends IResource | IMetaResource>(
    record: Partial<T>
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
      const query = resolveMergeQuery(record);
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
        const { query: upsertQuery, id } = resolveUpsertQuery(
          record.id.toString(),
          record
        );
        logger.log({
          at: "SurrealPersistence.merge - record not present, fallback to upsert",
          record,
          upsertQuery
        });
        const upsertResult = await this.instance?.query(upsertQuery);
        logger.log({
          at: "SurrealPersistence.merge - upsert result",
          upsertResult
        });
        return upsertResult;
      }
      return result;
    } catch (e) {
      logger.error({ at: "SurrealPersistence.merge", e });
    } finally {
      this.isProcessingOperation = false;
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
      this.isProcessingOperation = false;
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
  ): Promise<any> | undefined {
    try {
      await this.awaiter("bulkEditTemp_" + resource);
      const changedProperties = { ...records[0] };
      delete changedProperties.id;
      logger.log({
        at: "SurrealPersistence.bulkEditTemp",
        resource,
        changedProperties,
        records
      });
      return this.instance?.query(
        `UPDATE ${resource} MERGE $properties where id in $ids;`,
        {
          properties: changedProperties,
          ids: records.map((x) => x.id)
        }
      );
    } catch (e) {
      logger.error({ at: "SurrealPersistence.bulkEditTemp", e });
    } finally {
      this.isProcessingOperation = false;
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
      this.isProcessingOperation = false;
    }
    return null;
  }

  /**
   *
   * Using query_raw instead of query as the util function `interceptSurrealResponse` works with raw response - which is the default on http based Surreal API calls.
   *
   * @param resourceId
   * @param properties
   * @returns
   */
  async select(resourceId: IRecordId, properties?: string[]): Promise<any> {
    try {
      await this.awaiter("select_" + resourceId);
      const props = properties ?? [];
      const selectClause =
        props.length > 0 ? `SELECT ${props.join(", ")}` : "SELECT *";
      const query = `${selectClause} FROM ONLY ${resourceId};`;
      logger.log({ at: "SurrealPersistence.select", query });
      const result = await this.instance?.query_raw(query);
      return interceptSurrealResponse(result);
    } catch (e) {
      logger.error({ at: "SurrealPersistence.select", e });
    } finally {
      this.isProcessingOperation = false;
    }
    return null;
  }

  async selectMany(
    resource: Resource,
    params?: IResourceSelectParams
  ): Promise<any> {
    try {
      await this.awaiter("selectMany_" + resource);
      const properties = params?.properties ?? [];
      if (params?.searchType === SearchType.SEMANTIC && params?.search?.query) {
        // this.queryEmbedding = await FeatureExtractor.generateVectorEmbeddings(
        //   params.search.query
        // );
        tacoWorker.postMessage({
          action: TacoActions.GET_EMBEDDINGS,
          params: {
            text: params.search.query
          }
        });
        this.queryEmbedding = await new Promise((resolve, reject) => {
          tacoWorker.onmessage = (e) => {
            resolve(e.data);
          };
        });
        properties.push(
          `vector::similarity::cosine(embedding,[${this.queryEmbedding}]) AS dist`
        );
      }
      const filters = params?.filters ?? {};
      const whereClause = this.generateWhereClause(params);
      const selectClause =
        properties.length > 0 ? `SELECT ${properties.join(", ")}` : "SELECT *";

      let query = `${selectClause} FROM ${resource} ${whereClause}`;
      if (params?.groupBy) query += ` GROUP BY ${params.groupBy.join(", ")}`;
      if (params?.orderBy)
        query += ` ORDER BY ${this.generateOrderByClause(params.orderBy)}`;
      if (params?.limit) query += ` LIMIT ${params.limit}`;
      if (params?.offset) query += ` START ${params.offset}`;
      if (resource !== Resource.mutation) {
        logger.log({
          at: "SurrealPersistence.selectMany - query",
          resource,
          query,
          params
        });
        // console.time("SurrealPersistence.selectMany");
      }
      const result = await this.instance?.query_raw(query, params);
      if (resource !== Resource.mutation) {
        // console.timeEnd("SurrealPersistence.selectMany");
        logger.log({
          at: "SurrealPersistence.selectMany - result",
          result,
          resource
        });
      }
      return interceptSurrealResponse(result);
    } catch (e) {
      logger.error({ at: "SurrealPersistence.selectMany", e });
    } finally {
      this.isProcessingOperation = false;
    }
    return null;
  }

  private generateOrderByClause(orderBy: IResourceSelectParams["orderBy"]) {
    if (!orderBy) return "";
    return Object.keys(orderBy)
      .map((key) => `${key} ${orderBy[key]}`)
      .join(", ");
  }

  /**
   *
   * Note: using `string::lowercase()` on property field is resulting in no results at times.
   *
   * Ex: when searching for nodes and if property is `label`. Working fine for other properties like `body` or `contentType` or for Collection search with label property.
   * @param search
   * @returns
   */
  private generateSearchClause(search: IResourceSelectParams["search"]) {
    if (!search) return "";
    const conditions: string[] = [];
    search.properties?.forEach((property, index) => {
      // conditions.push(`string::lowercase('${search.query}') IN string::lowercase(${property})`);
      // conditions.push(`'${search.query}' IN ${property}`);
      conditions.push(`${property} @${index + 1}@ '${search.query}'`);
    });
    return `(${conditions.join(" OR ")})`;
  }
  /**
   * USe <|10|,COSINE> for brute force search where you don't want keep rerunning indexes on every new item addition
   * @param searchQuery
   * @returns
   */
  private generateSemanticSearchClause(k: number = 3) {
    return `embedding <|${k}|> [${this.queryEmbedding}]`;
  }
  private generateWhereClause(params?: IResourceSelectParams): string {
    const conditions: string[] = [];

    const whereClause = params?.whereClause;
    if (whereClause && typeof whereClause === "string") {
      conditions.push(whereClause);
    } else if (whereClause && typeof whereClause === "object") {
      conditions.push(whereClause.join(" AND "));
    }

    if (params?.searchType === SearchType.SEMANTIC && params?.search) {
      conditions.push(
        this.generateSemanticSearchClause(params.semanticSearchTopK)
      );
    } else if (params?.search) {
      conditions.push(this.generateSearchClause(params.search));
    }

    for (const [key, value] of Object.entries(params?.filters ?? {})) {
      if (Array.isArray(value)) {
        conditions.push(`${key} IN [${value.map(formatValue).join(", ")}]`);
      } else if (typeof value === "object") {
        if ("greaterThan" in value) {
          conditions.push(`${key} > ${formatValue(value.greaterThan)}`);
        }
        if ("lessThan" in value) {
          conditions.push(`${key} < ${formatValue(value.lessThan)}`);
        }
        if ("greaterThanOrEqual" in value) {
          conditions.push(`${key} >= ${formatValue(value.greaterThanOrEqual)}`);
        }
        if ("lessThanOrEqual" in value) {
          conditions.push(`${key} <= ${formatValue(value.lessThanOrEqual)}`);
        }
        if ("notIn" in value) {
          conditions.push(
            `${key} NOT IN [${value.notIn.map(formatValue).join(", ")}]`
          );
        }
      } else if (typeof value === "boolean") {
        if (value === true) {
          conditions.push(`${key} IS true`);
        } else if (value === false) {
          conditions.push(
            `(${key} IS NULL OR ${key} IS false OR ${key} IS NONE OR ${key} IS 0)`
          );
        }
      } else if (value !== undefined) {
        conditions.push(`${key} = ${formatValue(value)}`);
      }
    }

    // return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const clause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return commonQueryReplacements(clause);

    function formatValue(value: IPrimitiveDbDataType): string {
      if (typeof value === "string") {
        return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
      }
      if (typeof value === "boolean") {
        return value ? "true" : "false"; // Use 'true' and 'false' for boolean literals
      }
      return String(value);
    }
  }
}
