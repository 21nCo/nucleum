// const { default: Surreal } = require("surrealdb.node");
// const fetch = require("node-fetch");
// async function fetchResponse(url, options) {
//   const fetch = await import("node-fetch");
//   return fetch.default(url, options);

import { Agent, DatabaseQueryParams, CONTEXT } from "./types/account.type";

// }
export async function performQuery(body: any) {
  const response = await fetch(new URL(process.env.VITE_BACKEND!), {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "text/plain",
      Authorization: "Basic " + process.env.VITE_AUTH,
      Accept: "application/json",
      NS: process.env.USER_NS ?? "",
      DB: process.env.SURREAL_USER_DB ?? ""
    }
  });
  console.log({ body, response });
  return await response.json();
}
export async function performMasterQuery(query: any) {
  return performRootQuery({
    query,
    dbType: CONTEXT.ADMIN,
    instance: process.env.MASTER_DB_INSTANCE,
    isMasterDb: true
  });
}
export async function performAdminQuery(query: any) {
  return performRootQuery({ query, dbType: CONTEXT.ADMIN });
}

export async function performScopeQuery(query: any, agent: Agent) {
  let dbType = CONTEXT.USER;
  if (agent.context) dbType = agent.context as CONTEXT;
  return performRootQuery({
    query,
    dbType,
    db: agent.db
  });
}

async function performRootQuery(params: DatabaseQueryParams) {
  // console.log("env", process.env);
  let headers = new Headers();
  headers.append("Content-Type", "text/plain");
  headers.append(
    "Authorization",
    "Basic " +
      btoa(
        process.env.DB_USER +
          ":" +
          (params.isMasterDb ? process.env.MASTER_DB_PASS : process.env.DB_PASS)
      )
  );
  headers.append("Accept", "application/json");
  headers.append(
    "NS",
    params.dbType === CONTEXT.ADMIN
      ? process.env.ADMIN_NS ?? "ADMIN"
      : params.dbType === CONTEXT.USER
      ? process.env.USER_NS ?? "USER"
      : process.env.SPACE_NS ?? "SPACE"
  );
  headers.append(
    "DB",
    params.dbType === CONTEXT.ADMIN
      ? process.env.ADMIN_DB ?? "ADMIN"
      : params.db ?? ""
  );
  const body = params.query;
  console.log("performing root query:", {
    body,
    headers:
      headers instanceof Headers
        ? Object.fromEntries(headers.entries())
        : headers
  });
  let endPoint = (params.instance ?? process.env.DB_INSTANCE) + "/sql";
  // console.log({ endPoint });
  const response = await fetch(endPoint, {
    method: "POST",
    body,
    headers
  });
  console.log({ endPoint, response });
  // const json = await response.text();
  // console.log({ json });
  const json = await response.json();
  // console.log({ json });
  return json;
}

// const db = new Surreal();
// export async function signupSystemUser(userId, passhash) {
//   try {
//     await db.connect(`${process.env.DB_INSTANCE}/rpc`, {
//       namespace: process.env.USER_NS,
//       auth: {
//         username: process.env.DB_USER,
//         password: process.env.DB_PASS,
//       },
//     });
//     const creationQuery = `USE NS ${process.env.USER_NS} DB ${userId}; DEFINE USER ${userId} on database password "${passhash}" ROLES EDITOR;`;
//     console.log({ creationQuery });
//     const response = await db.query(creationQuery);
//     console.log("signup using sdk", { response });
//     const token = await signinSystemUser(userId, passhash);
//     console.log({ token });
//     return token;
//   } catch (e) {
//     console.error("ERROR", e);
//   } finally {
//     await db.close();
//   }
// }
// async function signupScopedUser(data, userId) {
//   // const token = await db.signup({
//   //   namespace: process.env.USER_NS,
//   //   database: userId,
//   //   scope: "database",
//   //   email,
//   //   password: pass,
//   // });
// }
// export async function signinSystemUser(userId, password) {
//   try {
//     await db.connect(`${process.env.DB_INSTANCE}/rpc`, {
//       namespace: process.env.USER_NS,
//     });
//     const token = await db.signin({
//       namespace: process.env.USER_NS,
//       database: userId,
//       username: userId,
//       password,
//     });
//     return token;
//   } catch (e) {
//     console.error("ERROR", e);
//   } finally {
//     await db.close();
//   }
// }
