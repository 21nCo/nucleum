// const { default: Surreal } = require("surrealdb.node");
// const fetch = require("node-fetch");
// async function fetchResponse(url, options) {
//   const fetch = await import("node-fetch");
//   return fetch.default(url, options);

import { isValidString } from "$lib/shared/utils/text.utils";
import { DatabaseError } from "./common/errors";
import {
  Agent,
  DatabaseQueryParams,
  CONTEXT
} from "./common/account/account.type";

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
  return await response.json();
}
export async function performQueryOnMasterDb(query: any) {
  return performRootQuery({
    query,
    dbType: CONTEXT.ADMIN,
    instance: "db." + process.env.DOMAIN
  });
}

export async function performQueryOnRegionalDb(
  query: string,
  props: { region: string; db: string; context?: CONTEXT }
) {
  const instance =
    isValidString(props.region) && props.region != "global"
      ? props.region + ".db." + process.env.DOMAIN
      : "db." + process.env.DOMAIN;
  return performRootQuery({
    query,
    instance,
    dbType: props.context ?? CONTEXT.USER,
    db: props.db
  });
}

/**
 * Performs a query on the regional database of the agent delegated by the agent to perform on behalf of the agent.
 *
 * Note: This is used in conjunction with read queries from client directly to database. Write queries are delegated via backend to database.
 *
 * @param query
 * @param agent
 * @returns
 */
export async function performAgentProxyQuery(query: any, agent: Agent) {
  return performQueryOnRegionalDb(query, {
    context: agent.context ? (agent.context as CONTEXT) : CONTEXT.USER,
    db: agent.db,
    region: agent.region
  });
}

async function performRootQuery(params: DatabaseQueryParams) {
  try {
    let headers = new Headers();
    headers.append("Content-Type", "text/plain");
    headers.append(
      "Authorization",
      "Basic " + btoa(process.env.DB_USER + ":" + process.env.DB_PASS)
    );
    headers.append("Accept", "application/json");
    const namespace = resolveNamespace(params.dbType);
    const db =
      params.dbType === CONTEXT.ADMIN
        ? process.env.ADMIN_DB_NAME ?? "ADMIN"
        : params.db ?? "";
    headers.append("NS", namespace);
    headers.append("DB", db);
    const body = `USE NAMESPACE ${namespace}; USE DATABASE ${db}; ${params.query}`;
    let endPoint = "https://" + params.instance + "/sql";
    console.log({ endPoint, body });
    const response = await fetch(endPoint, {
      method: "POST",
      body,
      headers
    });
    // const json = await response.text();
    // console.log({ json });
    const contentType = response.headers.get("Content-Type");
    let json;
    if (contentType && contentType.includes("text/html")) {
      const text = await response.text();
      console.error("Received HTML instead of JSON:", text);
      throw new DatabaseError("Received HTML response instead of JSON");
    } else {
      json = await response.json();
    }
    if (json && Array.isArray(json)) {
      return json.slice(2);
    }
    return json;
  } catch (e) {
    console.error({ at: "performRootQuery - error", error: e });
    throw new DatabaseError("Database query failed");
  }

  function resolveNamespace(dbType: CONTEXT) {
    switch (dbType) {
      case CONTEXT.ADMIN:
        return process.env.ADMIN_NS ?? "admin";
      case CONTEXT.USER:
        return process.env.USER_NS ?? "user";
      case CONTEXT.SPACE:
        return process.env.SPACE_NS ?? "space";
      default:
        return process.env.USER_NS ?? "user";
    }
  }
}
