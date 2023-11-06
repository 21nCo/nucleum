import jwt_decode from "jwt-decode";
import type { SurrealResponse } from "../types/surreal.type";
import { Surreal } from "surrealdb.js";
import type { DbRecordType } from "$lib/local/types/item.type";

const isUseSurrealSDK = import.meta.env.VITE_IS_USE_SURREAL_SDK ?? true;
export class SurrealDatabaseUsingHttp {
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
  async create(recordId: string, data: any) {
    let response: any = await this.query(
      "create $tb content $data return id;",
      {
        tb: recordId,
        data: JSON.stringify(data),
      }
    );
    if (response && response.length > 0) return response[1].result[0].id;
    else return null;
  }
  async insert(tableName: string, data: any[]) {
    let response: any = await this.query("insert into $tb $data return id;", {
      tb: tableName,
      data: JSON.stringify(data),
    });
    if (response && response.length > 0) return response[1].result[0].id;
    else return null;
  }
  /**
   *
   * @param recordId Id of the record to be merged
   * @param data Data to be updated
   * @returns Updated record or null if failed
   */
  async merge(recordId: string, data: any) {
    let response: any = await this.query("UPDATE $record MERGE $data;", {
      record: recordId,
      data: JSON.stringify(data),
    });
    if (response && response.length > 0) return response[1].result[0];
    else return null;
  }
  async update(recordId: string, data: any) {
    return this.query("UPDATE $record CONTENT $data;", {
      record: recordId,
      data: JSON.stringify(data),
    });
  }
  async select(recordId: string) {
    let response: any = await this.query("select * from $tb;", {
      tb: recordId,
    });
    if (response && response.length > 0) return response[1].result;
    else return null;
  }
  async delete(recordId: string) {
    let response = await this.query("DELETE $record;", {
      record: recordId,
    });
    if (response && response.length > 0) return response[1].result.length == 0;
    else return null;
  }
  async query(
    query: string,
    params: {
      [key: string]: string | number | boolean | DbRecordType | DbRecordType[];
    }
  ) {
    try {
      this.token = localStorage.getItem("surreal-token");
      if (!this.token) throw new Error("User not logged in");
      let decodedToken: any = jwt_decode(this.token);
      this.userId = decodedToken?.ID ?? "";
      for (const key in params) {
        query = query.replaceAll("$" + key, `${params[key]}`);
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
      if (response.ok) return await response.json();
      else return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

const db = new Surreal();

export async function runSurrealSdkTest() {
  try {
    // Connect to the database
    let userId;
    const token = localStorage.getItem("surreal-token");
    if (token) {
      let decodedToken: any = jwt_decode(token);
      userId = decodedToken?.ID ?? "";
    }

    await db.connect(`https://blanksurreal.fly.dev/rpc`, {
      // Set the namespace and database for the connection
      namespace: "TIDYDEV",
      database: userId,

      // Set the authentication details for the connection
      // auth: {
      //   namespace: "test",
      //   database: "test",
      //   scope: "user",
      //   username: "info@surrealdb.com",
      //   password: "my-secret-password",
      // },
    });
    db.authenticate(token ?? "");
    // Create a new person with a random id
    return await db.create("person", {
      title: "Founder & CEO",
      name: {
        first: "Some person",
        last: "another person",
      },
      marketing: false,
      identifier: Math.random().toString(36).substr(2, 10),
    });

    // // Update a person record with a specific id
    // const updated = await db.merge("person:jaime", {
    //   marketing: true,
    // });

    // // Select all people records
    // const people = await db.select("person");

    // // Perform a custom advanced query
    // const groups = await db.query(
    //   "SELECT marketing, count() FROM type::table($tb) GROUP BY marketing",
    //   {
    //     tb: "person",
    //   }
    // );
  } catch (e) {
    console.error("ERROR", e);
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
    //await this.db.close();
  }
  async connect() {
    try {
      this.token = localStorage.getItem("surreal-token");
      if (!this.token) throw new Error("User not logged in");
      let decodedToken: any = jwt_decode(this.token);
      this.userId = decodedToken?.ID ?? "";
      //console.log({ userId: this.userId, url: `${this.instance}/rpc` });
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
    return this.db.status === 0 || (await this.connect());
  }
  async create(recordId: string, data: any) {
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
  async insert(tableName: string, data: any[]) {
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
  async merge(recordId: string, data: any) {
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
  async update(recordId: string, data: any) {
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
      [key: string]: string | number | boolean | DbRecordType | DbRecordType[];
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
  surreal: SurrealDatabaseUsingSdk | SurrealDatabaseUsingHttp;
  constructor(private instance: string = "") {
    this.token = localStorage.getItem("surreal-token");
    if (isUseSurrealSDK) this.surreal = new SurrealDatabaseUsingSdk(instance);
    else this.surreal = new SurrealDatabaseUsingHttp(instance);
    if (this.token) {
      let decodedToken: any = jwt_decode(this.token);
      this.userId = decodedToken?.ID ?? "";
    }
  }
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
      [key: string]: string | number | boolean | DbRecordType | DbRecordType[];
    } = {}
  ) {
    return this.surreal.query(query, params);
  }
}
