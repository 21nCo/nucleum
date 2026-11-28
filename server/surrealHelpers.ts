// const { default: Surreal } = require("surrealdb.node");
// const fetch = require("node-fetch");
// async function fetchResponse(url, options) {
//   const fetch = await import("node-fetch");
//   return fetch.default(url, options);

import { isValidString } from "$lib/shared/utils/text.utils";
import regions from "../deployment/regions.json";
import { DatabaseError, ValidationError } from "./common/errors";
import {
  Agent,
  DatabaseQueryParams,
  CONTEXT,
  QueryVars
} from "./common/account/account.type";

const GLOBAL_REGION = "global";
const REGION_CODES: ReadonlySet<string> = new Set(
  (regions as { code: string }[]).map((region) => region.code)
);
const IDENTIFIER = /^[A-Za-z0-9_]+$/;
const VARIABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** True for a region the client may name: a code in deployment/regions.json or "global". */
export function isKnownRegion(region: unknown): region is string {
  return (
    typeof region === "string" &&
    (region === GLOBAL_REGION || REGION_CODES.has(region))
  );
}

/**
 * Database host for a region. Only codes from deployment/regions.json pick a
 * regional host; anything else is refused so a caller can never choose the
 * host that receives the root credentials.
 */
export function resolveDatabaseInstance(region: string | undefined) {
  if (!isValidString(region) || region === GLOBAL_REGION) {
    return "db." + process.env.DOMAIN;
  }
  if (!isKnownRegion(region)) {
    throw new ValidationError("Unknown region");
  }
  return region + ".db." + process.env.DOMAIN;
}

/**
 * Returns `value` when it is a plain identifier (letters, digits, `_`), the
 * only form that can be written into SurrealQL as a record key, namespace or
 * database name. Throws otherwise.
 */
export function assertIdentifier(value: unknown, label = "id"): string {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    throw new ValidationError(`Invalid ${label}`);
  }
  return value;
}

/**
 * The serialized `user:<id>` record id for an account id as the account code
 * passes it around (the part after `user:`, which keeps SurrealDB's `⟨…⟩`
 * escaping and numeric keys). Bind it and convert it with `type::record($user)`
 * so it resolves to the same record the old inline `user:${id}` did.
 */
export function userRecord(id: string) {
  return `user:${id}`;
}

/**
 * How SurrealQL 2.3.3 read a value that used to be pasted into a
 * double-quoted string literal: escapes decoded (\\u{} is U+0000, a bare
 * leading surrogate must be followed by a bare trailing one), or undefined
 * when that literal would not have parsed. Used only to recognise credentials
 * stored by the old queries.
 */
export function decodeLegacyStringLiteral(value: string) {
  const simple: Record<string, string> = {
    '"': '"',
    "/": "/",
    "\\": "\\",
    b: "\b",
    f: "\f",
    n: "\n",
    r: "\r",
    t: "\t"
  };
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '"') return undefined;
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = value[++i];
    if (next === undefined) return undefined;
    if (next in simple) {
      out += simple[next];
    } else if (next === "u" && value[i + 1] === "{") {
      const end = value.indexOf("}", i + 2);
      if (end < 0) return undefined;
      const hex = value.slice(i + 2, end);
      if (!/^[0-9a-fA-F]{0,6}$/.test(hex)) return undefined;
      const codePoint = hex ? parseInt(hex, 16) : 0;
      if (codePoint > 0x10ffff || isSurrogate(codePoint)) return undefined;
      out += String.fromCodePoint(codePoint);
      i = end;
    } else if (next === "u" && /^[0-9a-fA-F]{4}$/.test(value.slice(i + 1, i + 5))) {
      const unit = parseInt(value.slice(i + 1, i + 5), 16);
      i += 4;
      if (unit >= 0xdc00 && unit <= 0xdfff) return undefined;
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const low = /^\\u([0-9a-fA-F]{4})/.exec(value.slice(i + 1));
        const lowUnit = low ? parseInt(low[1], 16) : -1;
        if (lowUnit < 0xdc00 || lowUnit > 0xdfff) return undefined;
        out += String.fromCharCode(unit, lowUnit);
        i += 6;
      } else {
        out += String.fromCharCode(unit);
      }
    } else {
      return undefined;
    }
  }
  return out;
}

function isSurrogate(codePoint: number) {
  return codePoint >= 0xd800 && codePoint <= 0xdfff;
}

/**
 * Query variables for SurrealDB's RPC `query` method, which binds them to
 * `$name` in the query. They travel as JSON in the request body, so they are
 * bound as values and never parsed as query text, and never appear in a URL
 * (or a proxy's access log). `undefined` values are left out (they read as
 * NONE).
 */
export function toQueryVars(vars?: QueryVars) {
  const result: QueryVars = {};
  for (const [name, value] of Object.entries(vars ?? {})) {
    if (!VARIABLE_NAME.test(name)) {
      throw new ValidationError(`Invalid query variable ${name}`);
    }
    if (value !== undefined) result[name] = value;
  }
  return result;
}

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
export async function performQueryOnMasterDb(query: any, vars?: QueryVars) {
  return performRootQuery({
    query,
    vars,
    dbType: CONTEXT.ADMIN,
    instance: "db." + process.env.DOMAIN
  });
}

export async function performQueryOnRegionalDb(
  query: string,
  props: { region?: string; db: string; context?: CONTEXT; vars?: QueryVars }
) {
  return performRootQuery({
    query,
    vars: props.vars,
    instance: resolveDatabaseInstance(props.region),
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
export async function performAgentProxyQuery(
  query: any,
  agent: Agent,
  vars?: QueryVars
) {
  return performQueryOnRegionalDb(query, {
    context: agent.context ? (agent.context as CONTEXT) : CONTEXT.USER,
    db: agent.db,
    region: agent.region,
    vars
  });
}

/**
 * Runs a query with root credentials through SurrealDB's RPC `query` method.
 * Returns the per-statement results (the shape /sql returned) without the two
 * USE statements, or the RPC error.
 */
async function performRootQuery(params: DatabaseQueryParams) {
  try {
    let headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append(
      "Authorization",
      "Basic " + btoa(process.env.DB_USER + ":" + process.env.DB_PASS)
    );
    headers.append("Accept", "application/json");
    const namespace = assertIdentifier(
      resolveNamespace(params.dbType),
      "namespace"
    );
    const db = assertIdentifier(
      params.dbType === CONTEXT.ADMIN
        ? process.env.ADMIN_DB_NAME ?? "ADMIN"
        : params.db,
      "database"
    );
    headers.append("NS", namespace);
    headers.append("DB", db);
    headers.append("Surreal-NS", namespace);
    headers.append("Surreal-DB", db);
    const sql = `USE NAMESPACE ${namespace}; USE DATABASE ${db}; ${params.query}`;
    const endPoint = "https://" + params.instance + "/rpc";
    console.log({ instance: params.instance, namespace, db });
    const response = await fetch(endPoint, {
      method: "POST",
      body: JSON.stringify({
        id: 1,
        method: "query",
        params: [sql, toQueryVars(params.vars)]
      }),
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
    if (json && Array.isArray(json.result)) {
      return json.result.slice(2);
    }
    return json?.error ?? json;
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
