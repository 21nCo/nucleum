export class SurrealDatabase {
  token: string;
  constructor(private instance: string = "") {
    this.token = localStorage.getItem("surreal-token") ?? "";
  }
  async connect(instance: string, options: any) {
    this.instance = instance;
    this.token = localStorage.getItem("surreal-token") ?? this.token;
    await fetch(instance, { method: "POST" });
  }

  async create(recordId: string, data: any) {
    return this.query("create $tb content $data;", {
      tb: recordId,
      data: JSON.stringify(data),
    });
  }
  async merge(recordId: string, data: any) {
    return this.query("UPDATE $tb MERGE $data;", {
      tb: recordId,
      data: JSON.stringify(data),
    });
  }
  async update(recordId: string, data: any) {
    return this.query("UPDATE $tb CONTENT $data;", {
      tb: recordId,
      data: JSON.stringify(data),
    });
  }
  async select(recordId: string) {
    return this.query("select * from $tb;", {
      tb: recordId,
    });
  }
  async delete(recordId: string) {
    return this.query("DELETE $tb;", {
      tb: recordId,
    });
  }
  async query(query: string, params: any) {
    for (const key in params) {
      query = query.replace("$" + key, params[key]);
    }
    let response = await fetch(this.instance + "/sql", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Accept: "application/json",
        Authorization: "Bearer " + this.token,
      },
      body: query,
    });
    if (response.ok) return await response.json();
    else return null;
  }
}
