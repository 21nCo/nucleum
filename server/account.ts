import { globalDbo } from "$lib/shared/dbo/global.dbo";
import { pointronDboDefinitions } from "$lib/shared/dbo/pointron.dbo";
import { pointronTables } from "$lib/shared/dbo/pointron.tables";
import { extractProduct } from "$lib/shared/utils/utils";
import {
  performQueryOnMasterDb,
  performAgentProxyQuery
} from "./surrealHelpers";
import type { Agent } from "./common/account/account.type";

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
  const tables = [...pointronTables];
  const functions = {
    ...globalDbo,
    ...pointronDboDefinitions
  };
  let updates: any[] = [];
  dependencies.forEach((dependency) => {
    const definition = functions[dependency];
    if (!definition) return;
    updates.push(...definition);
  });
  let updateQuery = tables.join("; ") + ";" + updates.join("; ");
  updateQuery = updateQuery.replace(/\n/g, "");
  updateQuery = updateQuery.replace(/\t/g, "");
  return performAgentProxyQuery(updateQuery, agent);
}
