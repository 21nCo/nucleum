import jwt_decode from "jwt-decode";
import type { SurrealResponse } from "../types/surreal.type";

export class SurrealDatabase {
  token: string | null;
  userId: string | undefined;
  constructor(private instance: string = "") {
    this.token = localStorage.getItem("surreal-token");
    if (this.token) {
      let decodedToken: any = jwt_decode(this.token);
      this.userId = decodedToken?.user ?? "";
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
  async query(query: string, params: any) {
    try {
      this.token = localStorage.getItem("surreal-token");
      if (!this.token) throw new Error("User not logged in");
      let decodedToken: any = jwt_decode(this.token);
      this.userId = decodedToken?.user ?? "";
      for (const key in params) {
        query = query.replaceAll("$" + key, params[key]);
      }
      let response = await fetch(this.instance + "/sql", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          Accept: "application/json",
          Authorization: "Bearer " + this.token,
        },
        body: `USE database ${this.userId};  ${query}`,
      });
      if (response.ok) return await response.json();
      else return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}
