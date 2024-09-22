import { globalDbo } from "$lib/shared/dbo/global.dbo";
import { memotronDboDefinitions } from "$lib/shared/dbo/memotron.dbo";
import { memotronTables } from "$lib/shared/dbo/memotron.tables";
import { pointronDboDefinitions } from "$lib/shared/dbo/pointron.dbo";
import { pointronTables } from "$lib/shared/dbo/pointron.tables";
import { extractProduct } from "$lib/shared/utils/utils";
import {
  performQueryOnMasterDb,
  performQueryOnRegionalDb,
  performAgentProxyQuery
} from "./surrealHelpers";
import { validateToken } from "./token";
import { type Agent, CONTEXT } from "./types/account.type";

/**
 * @deprecated use updateDbV2 instead
 * @param host
 * @param lastRunChangeId
 * @returns
 */
export async function fetchDbDefinitionsQuery(
  host: string,
  lastRunChangeId: number
) {
  const extracredApp = extractProduct(host);
  const app = extracredApp.product ?? process.env.DOMAIN;
  const query = `return fn::admin::dbo::fetchAll("${app.toLowerCase()}", ${lastRunChangeId})`;
  const response = await performQueryOnMasterDb(query);
  const dbObjects: any[] = response[0].result;
  console.log("response for dbobject()", { response, dbObjects });
  if (!dbObjects || dbObjects.length === 0) return false;
  dbObjects.sort((a, b) => a.changeId - b.changeId);
  const highestChangeId = dbObjects[dbObjects.length - 1].changeId;
  const scripts = dbObjects.filter((o) => o.type === "script");
  const definitions = dbObjects.filter((o) => o.type != "script");
  console.log({ definitions, scripts });
  let definitionQuery = "";
  if (lastRunChangeId === 0) {
    definitionQuery = definitions.map((o) => o.definition + ";").join(";");
  } else {
    definitionQuery =
      scripts.map((o) => o.definition + ";").join(";") +
      scripts.map((o) => o.id + "();").join(";") +
      definitions.map((o) => o.definition + ";").join(";");
  }
  return {
    query: definitionQuery,
    highestChangeId
  };
}

/**
 * @deprecated use updateDbV2 instead
 * Updates the lastRunChangeId in the globalPreferences of the agent's database
 * @param agent Agent details with scope and db
 * @param lastRunVersionId id of the last run change
 * @returns
 */
export async function updateDbChangeRunStatus(
  agent: Agent,
  lastRunVersionId: number
) {
  const query = `update kv:dboVersion set version = ${lastRunVersionId}, modifiedAt = "${new Date().toISOString()}";`;
  const response = await performAgentProxyQuery(query, agent);
  if (response[0].result) return true;
  else return false;
}

/**
 * @deprecated use updateDbV2 instead
 * Updates the db definitions on a agent's database.
 *
 * @param agent the agent details with scope and db details
 * @param host the application host the agent is using
 * @param fromVersion
 * @returns
 */
// MARK- testing mini map
export async function updateDbDefinitions(
  agent: Agent,
  host: string,
  fromVersion: number
) {
  let definitionsResult = await fetchDbDefinitionsQuery(host, fromVersion);
  if (definitionsResult === false) return { message: "no new changes" };
  console.log("definitionsResult", { definitionsResult });
  let dbRunResponse = await performAgentProxyQuery(
    definitionsResult.query,
    agent
  );
  console.log({ dbRunResponse });
  const dbChangeUpdateStatus = await updateDbChangeRunStatus(
    agent,
    definitionsResult.highestChangeId
  );
  return {
    message:
      dbRunResponse && dbChangeUpdateStatus
        ? "updated successfully"
        : "something went wrong",
    dbRunResponse,
    dbChangeUpdateStatus,
    version:
      dbRunResponse && dbChangeUpdateStatus
        ? definitionsResult.highestChangeId
        : fromVersion
  };
}

/**
 * @deprecated use updateDbV2 instead
 * @param body
 * @param agent
 * @returns
 */
export async function updateDb(body: any, agent: Agent) {
  const fromVersion = body.fromVersion;
  if (!fromVersion) return { error: "fromVersion is required" };
  const host = body.context.host;
  console.log("running update db", {
    id: agent.id,
    fromVersion,
    host
  });
  return updateDbDefinitions(agent, host, fromVersion ?? 1);
}

export async function updateDbV2(body: any, agent: Agent) {
  const dependencies = body.dbo;
  if (!dependencies) return { error: "dbo is required" };
  const tables = [...pointronTables, ...memotronTables];
  const functions = {
    ...globalDbo,
    ...pointronDboDefinitions,
    ...memotronDboDefinitions
  };
  let updates: any[] = [];
  dependencies.forEach((dependency) => {
    const definition = functions[dependency];
    if (!definition) return;
    updates.push(...definition);
  });
  console.log("dbo updates", { tables, updates });
  let updateQuery = tables.join("; ") + ";" + updates.join("; ");
  updateQuery = updateQuery.replace(/\n/g, "");
  updateQuery = updateQuery.replace(/\t/g, "");
  console.log("updateQuery", updateQuery);
  return performAgentProxyQuery(updateQuery, agent);
}

export function authorize(props: { token: string; host?: string }) {
  try {
    //TODO - additional security checks
    const key = process.env.TOKEN_PRIVATE_KEY;
    if (!props.token || !key) return false;
    const decoded = validateToken(props);
    return decoded;
  } catch (err) {
    console.log(err);
    return false;
  }
}

/**
 * Initializes the database and definitions for a user account
 * @param id id of the resource that needs to be initialized - can be a user database or space database requested by the user
 * @param host
 * @returns
 */
export async function initializeDatabase(
  id: string,
  params: { scope: CONTEXT; host: string; region?: string }
) {
  console.log("initializing database ", { id });
  const ns =
    params.scope === CONTEXT.USER
      ? process.env.USER_NS ?? "USER"
      : process.env.SPACE_NS ?? "SPACE";
  let query = `USE NAMESPACE ${ns}; DEFINE DATABASE ${id}; USE DATABASE ${id}; DEFINE TOKEN ${process.env.TOKEN_NAME} ON DB TYPE RS384 VALUE "${process.env.TOKEN_PUBLIC_KEY}";`;
  console.log("db init query", { query });
  const dbCreationResponse = await performQueryOnRegionalDb(query, {
    region: params.region,
    db: id,
    context: params.scope
  });
  return dbCreationResponse;
}
