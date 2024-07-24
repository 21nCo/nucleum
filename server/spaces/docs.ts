import { performAgentProxyQuery } from "../surrealHelpers";
import { Agent, CONTEXT } from "../types/account.type";

export async function retrieveDoc(body: any, agent: Agent) {
  //TODO - check region resolution in this case
  const { documentId, spaceId } = body;
  const query = `return fn::memotron::node::fetch("node:${documentId}")`;
  const response = await performAgentProxyQuery(query, {
    db: spaceId,
    context: CONTEXT.SPACE,
    id: spaceId,
    region: agent.region
  });
  return response[0];
}
