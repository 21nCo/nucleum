import { performScopeQuery } from "../surrealHelpers";
import { Agent, CONTEXT } from "../types/account.type";

export async function retrieveDoc(body: any, agent: Agent) {
  const { documentId, spaceId } = body;
  const query = `return fn::memotron::node::fetch("node:${documentId}")`;
  const response = await performScopeQuery(query, {
    db: spaceId,
    context: CONTEXT.SPACE,
    id: spaceId
  });
  return response[0];
}
