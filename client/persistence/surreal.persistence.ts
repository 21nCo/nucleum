import type { IPersistence, IPersistenceInitParams } from "./persistence.type";
import { Surreal } from "surrealdb";
import { surrealdbWasmEngines } from "@surrealdb/wasm";
// import { Surreal } from "surrealdb.js";
// import { surrealdbWasmEngines } from "surrealdb.wasm";
import { logger } from "../components/debug/logger.client";
import { resolveDboUpdateQuery } from "$lib/shared/utils/surreal.utils";
import type { Resource } from "../components/resourceStores/resource.enum";
import type { IResource } from "../components/resourceStores/resource.type";
import type {
  IPrimitiveDbDataType,
  IResourceSelectParams
} from "../types/data.type";
import { Mutex } from "mutex-ts";
import { interceptSurrealResponse } from "../utils/utils";

export class SurrealPersistence implements IPersistence {
  instance: Surreal | undefined = undefined;
  userId: string = "";
  private isLocalMode: boolean = false;
  private mutex: Mutex = new Mutex();
  private isProcessingOperation: boolean = false;

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
      logger.debug({ at: "surreal.persistence.initialize", userId });
      await this.instance.connect("indxdb://blank");
      await this.instance.use({ namespace: "user", database: this.userId });
      await this.updateDbo(params);
      // await this.logInfo();
      await this.testQuery();
    } catch (err) {
      logger.error({ at: "surreal.persistence.initialize", err });
      throw err;
    }
    // this.wrapMethodsWithMutex();
  }

  /**
   * Using Mutex to wrap methods with surreal.js instance to prevent multiple requests from being executed at the same time. This is to avoid surreal-wasm throwing the error "esm.js?v=51497eef:2 Uncaught Error: recursive use of an object detected which would lead to unsafe aliasing in rust"
   */
  private wrapMethodsWithMutex() {
    const methodsToWrap = [
      "query",
      "insert",
      "update",
      "merge",
      "delete",
      "select"
    ];

    methodsToWrap.forEach((method) => {
      const originalMethod = this.instance?.[method]?.bind(this.instance);
      if (originalMethod) {
        this.instance[method] = async (...args: any[]) => {
          const operationId = Math.random().toString(36).substr(2, 9); // Generate a unique operation ID
          logger.debug({
            at: `SurrealPersistence.${method}`,
            message: "Operation starting",
            operationId,
            args
          });

          let release: (() => void) | undefined;
          try {
            logger.debug({
              at: `SurrealPersistence.${method}`,
              message: "Acquiring mutex",
              operationId
            });
            release = await this.mutex.obtain();
            logger.debug({
              at: `SurrealPersistence.${method}`,
              message: "Mutex acquired",
              operationId
            });

            logger.debug({
              at: `SurrealPersistence.${method}`,
              message: "Executing operation",
              operationId
            });
            const result = await originalMethod(...args);
            logger.debug({
              at: `SurrealPersistence.${method}`,
              message: "Operation executed successfully",
              operationId
            });

            return result;
          } catch (error) {
            logger.error({
              at: `SurrealPersistence.${method}`,
              message: "Operation failed",
              error,
              operationId
            });
            throw error; // Re-throw the error after logging
          } finally {
            if (release) {
              logger.debug({
                at: `SurrealPersistence.${method}`,
                message: "Releasing mutex",
                operationId
              });
              release();
              logger.debug({
                at: `SurrealPersistence.${method}`,
                message: "Mutex released",
                operationId
              });
            }
            logger.debug({
              at: `SurrealPersistence.${method}`,
              message: "Operation completed",
              operationId
            });
          }
        };
      }
    });
  }

  private async logInfo() {
    const info = await this.instance?.query("INFO FOR DATABASE;");
    logger.debug({
      at: "surreal.persistence.logInfo",
      userId: this.userId,
      info
    });
  }
  private async testQuery() {
    const result = await this.instance?.query(
      "select * from collection; select * from kv;"
    );
    logger.debug({
      at: "surreal.persistence.testQuery",
      userId: this.userId,
      result
    });
  }

  /**
   * Updates the database with dbo definitions.
   */
  updateDbo(params?: IPersistenceInitParams) {
    logger.debug({ at: "surreal.persistence.updateDbo" });
    const dependencies = params?.dbo;
    if (!dependencies) return;
    const query = resolveDboUpdateQuery(dependencies);
    return this.instance?.query(query);
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
   * Note: Using `.insert` method surreal.js directly would result in surreal-wasm not recognizing record links.
   *
   * Workaround to use .insert would be to use type::thing() transform for record links
   *
   *
   * @param records - records to be inserted
   * @param resource - resource i.e. table name
   * @returns
   */
  async insert<T extends IResource>(
    records: T[],
    resource: string
  ): Promise<any> {
    await this.awaiter();
    // return this.instance?.insert<T>(resource, records);
    const result = await this.instance?.query(
      `INSERT INTO ${resource} ${JSON.stringify(records)};`
    );
    this.isProcessingOperation = false;
    return result;
  }

  replace<T extends IResource>(record: T): Promise<any> | undefined {
    return this.instance?.update(record.id, record);
  }

  /**
   * TODO - test `.merge` method non functioning reason.
   * @param record
   * @returns
   */
  async merge<T extends IResource>(record: Partial<T>): Promise<any> {
    if (!record.id) return;
    await this.awaiter();
    logger.debug({ at: "SurrealPersistence.merge", record });
    // return this.instance?.merge(record.id, record);
    const result = await this.instance?.query(
      `UPDATE ${record.id} MERGE ${JSON.stringify(record)};`
    );
    this.isProcessingOperation = false;
    return result;
  }

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
    logger.debug({ at: "SurrealPersistence.query", query, params, result });
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
  async select(resourceId: string, properties?: string[]): Promise<any> {
    await this.awaiter();
    const props = properties ?? [];
    const selectClause =
      props.length > 0 ? `SELECT ${props.join(", ")}` : "SELECT *";
    const query = `${selectClause} FROM ONLY ${resourceId};`;
    logger.debug({ at: "SurrealPersistence.select", query });
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
    logger.debug({ at: "SurrealPersistence.selectMany", query, params });
    const result = await this.instance?.query_raw(query, params);
    this.isProcessingOperation = false;
    return interceptSurrealResponse(result);
  }

  private generateOrderByClause(orderBy: IResourceSelectParams["orderBy"]) {
    if (!orderBy) return "";
    return Object.keys(orderBy)
      .map((key) => `${key} ${orderBy[key]}`)
      .join(", ");
  }

  private generateSearchClause(search: IResourceSelectParams["search"]) {
    if (!search) return "";
    const conditions: string[] = [];
    for (const [key, value] of Object.entries(search)) {
      conditions.push(
        `string::lowercase('${value}') IN string::lowercase(${key})`
      );
    }
    return conditions.join(" AND ");
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
          `${key} BETWEEN ${formatValue(value.from)} AND ${formatValue(value.to)}`
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
