import jwt_decode from "jwt-decode";
import type { SurrealResponse } from "../types/surreal.type";
import { Surreal } from "surrealdb.js";
import type { DbRecordType } from "$lib/local/types/item.type";
import type { MergeRecord, QueryParams } from "../types/persistance.type";

const isUseSurrealSDK = import.meta.env.VITE_IS_USE_SURREAL_SDK ?? true;
export class SurrealDatabaseUsingRest {
  token: string | null;
  userId: string | undefined;
  constructor(private instance: string = "") {
    this.token = localStorage.getItem("surreal-token");
    if (this.token) {
      let decodedToken: any = jwt_decode(this.token);
      this.userId = decodedToken?.ID ?? "";
    }
  }
  async connect(instance: string, options: any) {
    this.instance = instance;
    this.token = localStorage.getItem("surreal-token") ?? this.token;
    await fetch(instance, { method: "POST" });
  }
  /**
   *
   * @param recordId Id of the record to be created
   * @param data data to be created
   * @returns Id of the created record or null if failed
   */
  async create(recordId: string, data: DbRecordType) {
    return this.query(`create ${recordId} content $data return id;`, {
      data,
    });
  }
  async insert(tableName: string, data: DbRecordType[]) {
    return this.query(`insert into ${tableName} $data return id;`, {
      data,
    });
  }
  /**
   *
   * @param recordId Id of the record to be merged
   * @param data Data to be updated
   * @returns Updated record or null if failed
   */
  async merge(recordId: string, data: MergeRecord) {
    return this.query(`UPDATE ${recordId} MERGE $data;`, {
      data,
    });
  }
  async update(recordId: string, data: DbRecordType) {
    return this.query(`UPDATE ${recordId} CONTENT $data;`, {
      data,
    });
  }
  async select(recordId: string) {
    let response = await this.query(`select * from ${recordId};`);
    if (response?.length > 0) return response[0];
    else return null;
  }
  async delete(recordId: string) {
    return await this.query("DELETE $record;", {
      record: recordId,
    });
  }
  async query(
    query: string,
    params: {
      [key: string]: QueryParams;
    } = {}
  ) {
    try {
      this.token = localStorage.getItem("surreal-token");
      if (!this.token) throw new Error("User not logged in");
      let decodedToken: any = jwt_decode(this.token);
      this.userId = decodedToken?.ID ?? "";
      for (const key in params) {
        let replaceWith;
        if (typeof params[key] === "object")
          replaceWith = JSON.stringify(params[key]);
        else if (typeof params[key] === "string")
          replaceWith = `"${params[key]}"`;
        else replaceWith = params[key];
        query = query.replaceAll("$" + key, `${replaceWith}`);
      }
      let response = await fetch(this.instance + "/sql", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          Accept: "application/json",
          Authorization: "Bearer " + this.token,
        },
        body: `USE database ${this.userId}; ${query}`,
      });
      if (response.ok) {
        let result = await response.json();
        console.log({ result });
        if (result.length > 0) {
          return result.slice(1).map((item: any) => {
            return item.result;
          });
        }
      } else return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

export class SurrealDatabaseUsingSdk {
  token: string | null;
  userId: string | undefined;
  db: Surreal;
  constructor(private instance: string = "") {
    this.token = localStorage.getItem("surreal-token");
    this.db = new Surreal();
    if (this.token) {
      let decodedToken: any = jwt_decode(this.token);
      this.userId = decodedToken?.ID ?? "";
      this.connect();
    }
  }
  async close() {
    //todo urgent - maintaining persistant connection vs closing connection
    //fly only allows 25 concurrent connections...
    //await this.db.close();
  }
  async connect() {
    try {
      this.token = localStorage.getItem("surreal-token");
      if (!this.token) throw new Error("User not logged in");
      let decodedToken: any = jwt_decode(this.token);
      this.userId = decodedToken?.ID ?? "";
      //console.log({ userId: this.userId, url: `${this.instance}/rpc` });
      this.db.strategy = "http";
      await this.db.connect(`${this.instance}/rpc`, {
        namespace: import.meta.env.VITE_SURREAL_USER_NS ?? "TIDIGIT",
        database: this.userId ?? "",
      });
      return await this.db.authenticate(this.token ?? "");
    } catch (error) {
      console.error("Error in Surreal connect", JSON.stringify(error));
      return null;
    }
  }
  async reconnectIfRequired() {
    console.log("reconnectIfRequired", this.db.status);
    if (this.db.status === 0) return true;
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
      let response = await this.db.create(recordId, data);
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
      let response = await this.db.insert(tableName, data);
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
      let response = await this.db.merge(recordId, data);
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
      let response = await this.db.update(recordId, data);
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
      let response = await this.db.select(recordId);
      return response;
    } catch (error) {
      console.log({ error });
      return null;
    } finally {
      this.close();
    }
  }
  async delete(recordId: string) {
    try {
      // this.reconnectIfRequired();
      let response = await this.db.delete(recordId);
      return response;
    } catch (error) {
      console.log(error);
      return null;
    } finally {
      this.close();
    }
  }
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
      let response = await this.db.query(query, params);
      return response;
    } catch (error) {
      console.log({ error });
      return null;
    } finally {
      this.close();
    }
  }
}

export class SurrealDatabase {
  token: string | null;
  userId: string | undefined;
  surreal: SurrealDatabaseUsingSdk | SurrealDatabaseUsingRest;
  constructor(private instance: string = "") {
    this.token = localStorage.getItem("surreal-token");
    if (isUseSurrealSDK == "true")
      this.surreal = new SurrealDatabaseUsingSdk(instance);
    else this.surreal = new SurrealDatabaseUsingRest(instance);
    if (this.token) {
      let decodedToken: any = jwt_decode(this.token);
      this.userId = decodedToken?.ID ?? "";
    }
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
  delete(recordId: string) {
    return this.surreal.delete(recordId);
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
