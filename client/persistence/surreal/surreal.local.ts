import type {
  IPersistence,
  IPersistenceInitParams,
  ISyncDelegate
} from "../persistence.type";
import { Surreal } from "surrealdb";
import { surrealdbWasmEngines } from "@surrealdb/wasm";
// import { Surreal } from "surrealdb.js";
// import { surrealdbWasmEngines } from "surrealdb.wasm";
import { logger } from "../../components/debug/logger.client";
import { resolveDboUpdateQuery } from "$lib/shared/utils/surreal.utils";
import { Resource } from "../../components/resourceStores/resource.enum";
import type {
  IMetaResource,
  IResource
} from "../../components/resourceStores/resource.type";
import type {
  IPrimitiveDbDataType,
  IRecordId,
  IResourceSelectParams
} from "../../types/data.type";
import { interceptSurrealResponse } from "../../utils/utils";
import { SyncDelegate } from "../sync";

export class SurrealPersistence implements IPersistence {
  instance: Surreal | undefined = undefined;
  syncDelegate: ISyncDelegate;
  userId: string = "";
  private isLocalMode: boolean = false;
  private isProcessingOperation: boolean = false;

  constructor() {
    this.syncDelegate = new SyncDelegate(this);
  }

  async initialize(userId: string, params?: IPersistenceInitParams) {
    if (this.userId === userId && this.instance) return;
    this.instance = new Surreal({
      engines: surrealdbWasmEngines({
        strict: false,
        capabilities: {
          guest_access: true,
          functions: true,
          network_targets: true
        }
      })
    });
    this.userId = userId;
    this.isLocalMode = params?.isLocalMode ?? false;
    try {
      logger.log({ at: "surreal.persistence.initialize", userId });
      await this.instance.connect("indxdb://blank");
      await this.instance.use({ namespace: "user", database: this.userId });
      await this.updateDbo(params);
      // await this.logInfo();
      // await this.testQuery();
    } catch (err) {
      logger.error({ at: "surreal.persistence.initialize", err });
      throw err;
    }
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
    const result = await this.instance?.query("select * from mutation;");
    logger.log({
      at: "surreal.persistence.testQuery",
      userId: this.userId,
      result
    });
    this.isProcessingOperation = false;
  }

  async delegateSync(query: string, resourceId?: IRecordId | Resource) {
    logger.log({
      at: "SurrealPersistence.delegateSync",
      query,
      resourceId,
      isLocalMode: this.isLocalMode
    });
    if (
      this.isLocalMode ||
      resourceId === Resource.mutation ||
      resourceId === Resource.file ||
      resourceId?.toString()?.includes(Resource.mutation)
    )
      return;
    return this.syncDelegate.mutation(query, resourceId);
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
    this.isProcessingOperation = false;
    return result;
  }

  private awaiter() {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (!this.isProcessingOperation) {
          clearInterval(interval);
          this.isProcessingOperation = true;
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
  ): Promise<any> {
    logger.log({
      at: "SurrealPersistence.insert",
      resource,
      isProcessingOperation: this.isProcessingOperation
    });
    await this.awaiter();
    let result;
    if (resource === "file") {
      result = await this.instance?.insert<T>(resource, records);
      this.isProcessingOperation = false;
    } else {
      const query = `INSERT INTO ${resource} ${JSON.stringify(records)};`;
      result = await this.instance?.query(query);
      this.isProcessingOperation = false;
      await this.delegateSync(query, resource);
    }
    return result;
  }

  replace<T extends IResource>(record: T): Promise<any> | undefined {
    return this.instance?.update(record.id, record);
  }

  /**
   * @param record
   * @returns
   */
  async merge<T extends IResource>(record: Partial<T>): Promise<any> {
    if (!record.id) return;
    await this.awaiter();
    logger.log({ at: "SurrealPersistence.merge", record });
    const query = `UPDATE ${record.id} MERGE ${JSON.stringify(record)};`;
    const result = await this.instance?.query(query);
    this.isProcessingOperation = false;
    await this.delegateSync(query, record.id);
    return result;
  }

  /**
   * TODO - delegateSync
   * @param resourceId
   * @returns
   */
  delete(resourceId: string): Promise<any> | undefined {
    return this.instance?.delete(resourceId);
  }

  bulkEdit<T extends IResource>(
    resource: Resource,
    records: T[]
  ): Promise<any> | undefined {
    return this.instance?.query(`UPDATE ${resource} MERGE $resources;`, {
      resources: records
    });
  }

  async query(query: string, params: any): Promise<any> {
    // return this.instance?.query(query, params);
    await this.awaiter();
    const result = await this.instance?.query_raw(query, params);
    logger.log({ at: "SurrealPersistence.query", query, params, result });
    this.isProcessingOperation = false;
    return interceptSurrealResponse(result);
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
    await this.awaiter();
    const props = properties ?? [];
    const selectClause =
      props.length > 0 ? `SELECT ${props.join(", ")}` : "SELECT *";
    const query = `${selectClause} FROM ONLY ${resourceId};`;
    logger.log({ at: "SurrealPersistence.select", query });
    const result = await this.instance?.query_raw(query);
    this.isProcessingOperation = false;
    return interceptSurrealResponse(result);
  }

  async selectMany(
    resource: Resource,
    params?: IResourceSelectParams
  ): Promise<any> {
    await this.awaiter();
    const properties = params?.properties ?? [];
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
    logger.log({
      at: "SurrealPersistence.selectMany",
      query,
      params,
      userId: this.userId
    });
    // await this.logInfo();
    // await this.testQuery();
    const result = await this.instance?.query_raw(query, params);
    logger.log({ at: "SurrealPersistence.selectMany - result", result });
    this.isProcessingOperation = false;
    return interceptSurrealResponse(result);
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

  private generateWhereClause(params?: IResourceSelectParams): string {
    const conditions: string[] = [];

    const whereClause = params?.whereClause;
    if (whereClause && typeof whereClause === "string") {
      conditions.push(whereClause);
    } else if (whereClause && typeof whereClause === "object") {
      conditions.push(whereClause.join(" AND "));
    }

    if (params?.search) {
      conditions.push(this.generateSearchClause(params.search));
    }

    for (const [key, value] of Object.entries(params?.filters ?? {})) {
      if (Array.isArray(value)) {
        conditions.push(`${key} IN [${value.map(formatValue).join(", ")}]`);
      } else if (
        typeof value === "object" &&
        "from" in value &&
        "to" in value
      ) {
        //TODO - ranges
        conditions.push(
          `${key} >= ${formatValue(value.from)} AND ${key} <= ${formatValue(value.to)}`
        );
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

    return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

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
