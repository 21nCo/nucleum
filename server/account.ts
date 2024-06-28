import { extractProduct } from "$lib/shared/utils/utils";
import { performAdminQuery, performScopeQuery } from "./surrealHelpers";
import { validateToken } from "./token";
import { type Agent, CONTEXT } from "./types/account.type";

export async function fetchDbDefinitionsQuery(
  host: string,
  lastRunChangeId: number
) {
  const extracredApp = extractProduct(host);
  const app = extracredApp.product ?? process.env.TIDY_SUBATOM;
  const query = `return fn::admin::dbo::fetchAll("${app.toLowerCase()}", ${lastRunChangeId})`;
  const response = await performAdminQuery(query);
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
  const response = await performScopeQuery(query, agent);
  if (response[0].result) return true;
  else return false;
}

/**
 *
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
  let dbRunResponse = await performScopeQuery(definitionsResult.query, agent);
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

export function authorize(token: string | undefined) {
  try {
    //TODO - additional security checks
    const key = process.env.TOKEN_PRIVATE_KEY;
    if (!token || !key) return false;
    const decoded = validateToken(token);
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
export async function initializeDatabaseAndDefinitions(
  id: string,
  scope: CONTEXT,
  host: string
) {
  console.log("initializing database ", { id });
  const ns =
    scope === CONTEXT.USER
      ? process.env.USER_NS ?? "USER"
      : process.env.SPACE_NS ?? "SPACE";
  let query = `USE NAMESPACE ${ns}; DEFINE DATABASE ${id}; USE DATABASE ${id}; DEFINE TOKEN ${process.env.TIDY_TOKEN_KEY} ON DB TYPE RS384 VALUE "${process.env.TOKEN_PUBLIC_KEY}";`;
  let definitionsResult = await fetchDbDefinitionsQuery(host, 0);
  if (definitionsResult) query += definitionsResult.query;
  console.log("db init query", { query });
  const dbCreationResponse = await performAdminQuery(query);
  if (definitionsResult)
    await updateDbChangeRunStatus(
      { id, db: id, context: CONTEXT.USER },
      definitionsResult.highestChangeId
    );
  // await runDefinitionScripts(userId, true); TODO - check the necessity of this old run definitions
  return dbCreationResponse;
}
