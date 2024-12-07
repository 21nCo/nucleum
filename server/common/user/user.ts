import { performAgentProxyQuery } from "../../surrealHelpers";
import { Agent } from "../account/account.type";

export async function performQueryOnBehalfOfUser(query: string, agent: Agent) {
  //TODO - check if the agent has permissions to perform the query if the context is space
  return performAgentProxyQuery(query, agent);
}
