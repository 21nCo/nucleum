import jwt_decode from "jwt-decode";
import { Surreal } from "surrealdb.js";
import type { MergeRecord, QueryParams } from "../types/persistance.type";
import { resolveToken } from "$lib/client/utils/account.utils";
import {
  performApiCall,
  performHttpNetworkOperation
} from "$lib/client/utils/network.utils";
import {
  replaceParams,
  resolveMutationQuery
} from "$lib/client/utils/surreal.utils";
import { PersistanceActionType } from "../types/data.type";
import type { ISurrealDatabase } from "../types/db.type";
import type { IResourceBase } from "../components/resourceStores/resource.type";

const isUseSurrealSDK = import.meta?.env?.VITE_IS_USE_SURREAL_SDK ?? true;

export class SurrealDatabaseUsingRest {
  token: string | null = null;
  db: string | undefined;
  constructor(private instance: string = "") {
    // this.token = resolveToken();
    // if (this.token) {
    //   let decodedToken: any = jwt_decode(this.token);
    //   this.db = decodedToken?.db ?? "";
    // }
  }
  async connect(instance: string, options: any) {
    this.instance = instance;
    this.token = localStorage.getItem("stoken") ?? this.token;
    await fetch(instance, { method: "POST" });
  }
  /**
   *
   * @param recordId Id of the record to be created
   * @param data data to be created
   * @returns Id of the created record or null if failed
   */
  async create(recordId: string, data: IResourceBase) {
    return this.query(
      resolveMutationQuery(PersistanceActionType.CREATE, recordId),
      {
        data
      }
    );
  }
  async insert(tableName: string, data: IResourceBase[]) {
    return this.query(
      resolveMutationQuery(PersistanceActionType.INSERT, tableName),
      {
        data
      }
    );
  }
  /**
   *
   * @param recordId Id of the record to be merged
   * @param data Data to be updated
   * @returns Updated record or null if failed
   */
  async merge(recordId: string, data: MergeRecord) {
    return this.query(
      resolveMutationQuery(PersistanceActionType.MERGE, recordId),
      {
        data
      }
    );
  }
  async update(recordId: string, data: IResourceBase) {
    return this.query(
      resolveMutationQuery(PersistanceActionType.REPLACE, recordId),
      {
        data
      }
    );
  }
  async select(recordId: string) {
    let response = await this.query(`select * from ${recordId};`);
    if (response?.length > 0) return response[0];
    else return null;
  }
  async delete(recordId: string, userId?: string) {
    return await this.query(
      resolveMutationQuery(PersistanceActionType.DELETE, recordId, { userId })
    );
  }
  async executeReadFn(
    query: string,
    params: {
      [key: string]: QueryParams;
    } = {}
  ) {
    return this.query(query, params, true);
  }
  async query(
    query: string,
    params: {
      [key: string]: QueryParams;
    } = {},
    isReadOperation: boolean = false
  ) {
    try {
      // const isValid = await performLoginStatusCheck();
      // if (!isValid) return null;
      const token = await resolveToken();
      if (!token) return null;
      this.token = token;
      // console.log("query", { query, params, token });
      let decodedToken: any = jwt_decode(this.token!);
      this.db = decodedToken?.db ?? "";
      const instance =
        decodedToken?.region && decodedToken?.region != "global"
          ? decodedToken?.region + "." + this.instance
          : this.instance;
      query = replaceParams(query, params);
      let response;
      if (isReadOperation) {
        response = await performHttpNetworkOperation({
          url: "https://" + instance + "/sql",
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
            Accept: "application/json",
            Authorization: "Bearer " + this.token
          },
          body: `USE database ${this.db}; ${query}`
        });
      } else {
        response = await performApiCall("account/n/run", "POST", {
          query: `USE database ${this.db}; ${query}`,
          db: this.db
        });
      }
      if (response?.ok) {
        let result = await response.json();
        if (result.length > 0) {
          return result.slice(1).map((item: any) => {
            return { result: item.result, status: item.status };
          });
        }
      } else return null;
    } catch (error) {
      //TODO - error handling
      console.log(error);
      return null;
    }
  }
}

export class SurrealDatabaseUsingSdk {
  token: string | null = null;
  db: string | undefined;
  surreal: Surreal;
  constructor(private instance: string = "") {
    // this.token = resolveToken();
    this.surreal = new Surreal();
    // if (this.token) {
    //   let decodedToken: any = jwt_decode(this.token);
    //   this.db = decodedToken?.db ?? "";
    //   this.connect();
    // }
  }
  async close() {
    //todo urgent - maintaining persistant connection vs closing connection
    //fly only allows 25 concurrent connections...
    //await this.db.close();
  }
  async connect() {
    try {
      // this.token = resolveToken();
      if (!this.token) throw new Error("User not logged in");
      let decodedToken: any = jwt_decode(this.token);
      this.db = decodedToken?.db ?? "";
      this.surreal.strategy = "http";
      await this.surreal.connect(`${this.instance}/rpc`, {
        namespace: import.meta.env?.VITE_SURREAL_USER_NS ?? "user",
        database: this.db ?? ""
      });
      return await this.surreal.authenticate(this.token ?? "");
    } catch (error) {
      console.error("Error in Surreal connect", JSON.stringify(error));
      return null;
    }
  }
  async reconnectIfRequired() {
    console.log("reconnectIfRequired", this.surreal.status);
    // const isValid = await performLoginStatusCheck();
    // if (!isValid) return false;
    if (this.surreal.status === 0) return true;
    else {
      let isConnected = await this.connect();
      return isConnected;
    }
  }
  async create(recordId: string, data: Record<string, unknown>) {
    try {
      let isConnected = await this.reconnectIfRequired();
      if (!isConnected) return null;
      // console.log("create", { recordId, data });
      let response = await this.surreal.create(recordId, data);
      return response;
    } catch (error) {
      console.log(error);
      return null;
    } finally {
      this.close();
    }
  }
  async insert(tableName: string, data: Record<string, unknown>[]) {
    try {
      let isConnected = await this.reconnectIfRequired();
      if (!isConnected) return null;
      // console.log("insert", { tableName, data });
      let response = await this.surreal.insert(tableName, data);
      return response;
    } catch (error) {
      console.log(error);
      return null;
    } finally {
      this.close();
    }
  }
  async merge(recordId: string, data: Record<string, unknown>) {
    try {
      let isConnected = await this.reconnectIfRequired();
      if (!isConnected) return null;
      // console.log("merge", { recordId, data });
      let response = await this.surreal.merge(recordId, data);
      return response;
    } catch (error) {
      console.log(error);
      return null;
    } finally {
      this.close();
    }
  }
  async update(recordId: string, data: Record<string, unknown>) {
    try {
      let isConnected = await this.reconnectIfRequired();
      if (!isConnected) return null;
      // console.log("update", { recordId, data });
      let response = await this.surreal.update(recordId, data);
      return response;
    } catch (error) {
      console.log(error);
      return null;
    } finally {
      this.close();
    }
  }
  async select(recordId: string) {
    try {
      let isConnected = await this.reconnectIfRequired();
      if (!isConnected) return null;
      // console.log("select", { recordId });
      let response = await this.surreal.select(recordId);
      return response;
    } catch (error) {
      console.log({ error });
      return null;
    } finally {
      this.close();
    }
  }
  async delete(recordId: string, userId?: string) {
    try {
      // this.reconnectIfRequired();
      let response = await this.surreal.delete(recordId);
      return response;
    } catch (error) {
      console.log(error);
      return null;
    } finally {
      this.close();
    }
  }
  executeReadFn = this.query;
  async query(
    query: string,
    params: {
      [key: string]: QueryParams;
    } = {}
  ) {
    try {
      let isConnected = await this.reconnectIfRequired();
      if (!isConnected) return null;
      // console.log("query", { query, params });
      let response = await this.surreal.query(query, params);
      return response;
    } catch (error) {
      console.log({ error });
      return null;
    } finally {
      this.close();
    }
  }
}

export class SurrealDatabase implements ISurrealDatabase {
  token: string | null = null;
  db: string | undefined;
  surreal: SurrealDatabaseUsingSdk | SurrealDatabaseUsingRest;
  constructor(private instance: string = "") {
    const instanceDefault =
      import.meta.env?.VITE_DB ?? process.env.PLASMO_PUBLIC_DB;
    this.instance = instanceDefault ?? instance;
    // this.token = resolveToken();
    if (isUseSurrealSDK == "true")
      this.surreal = new SurrealDatabaseUsingSdk(this.instance);
    else this.surreal = new SurrealDatabaseUsingRest(this.instance);
    // if (this.token) {
    //   let decodedToken: any = jwt_decode(this.token);
    //   this.db = decodedToken?.db ?? "";
    // }
  }
  //todo - add strong types
  create(recordId: string, data: any) {
    return this.surreal.create(recordId, data);
  }
  insert(tableName: string, data: any[]) {
    return this.surreal.insert(tableName, data);
  }
  merge(recordId: string, data: any) {
    return this.surreal.merge(recordId, data);
  }
  update(recordId: string, data: any) {
    return this.surreal.update(recordId, data);
  }
  select(recordId: string) {
    return this.surreal.select(recordId);
  }
  delete(recordId: string, userId?: string) {
    return this.surreal.delete(recordId, userId);
  }
  executeReadFn(
    query: string,
    params: {
      [key: string]: QueryParams;
    } = {}
  ) {
    return this.surreal.executeReadFn(query, params);
  }
  query(
    query: string,
    params: {
      [key: string]: QueryParams;
    } = {}
  ) {
    return this.surreal.query(query, params);
  }
}
