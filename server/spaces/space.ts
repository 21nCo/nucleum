import { initializeDatabaseAndDefinitions } from "../account";
import { performAdminQuery } from "../surrealHelpers";
import { generateSpaceToken } from "../token";
import { Agent, CONTEXT, MemberRole, SpaceAction } from "../types/account.type";

export function runSpaceAction(body: any, agent: Agent) {
  if (body.action === SpaceAction.CREATE) {
    return createSpace(body, agent);
  } else if (body.action === SpaceAction.SWITCH) {
    return switchSpace(body, agent);
  } else if (body.action === SpaceAction.GET_ALL) {
    return getAllSpaces(body, agent);
  }
}

async function createSpace(body: any, agent: Agent) {
  const { name, context } = body;
  const query = `return fn::admin::space::create("${name}", "user:${agent.id}")`;
  const response = await performAdminQuery(query);
  const id = response[0].result[0].id.split("space:")[1];
  await initializeDatabaseAndDefinitions(id, {
    scope: CONTEXT.SPACE,
    host: context.host
  });
  const token = await generateSpaceToken(id, agent.id, MemberRole.ADMIN);
  return { token, id };
}

async function switchSpace(body: any, agent: Agent) {
  const { id } = body;
  const query = `return fn::admin::space::fetchUser("space:${id}", "user:${agent.id}")`;
  const response = await performAdminQuery(query);
  const relation = response[0].result.relation;
  if (relation.role === MemberRole.ADMIN) {
    const token = await generateSpaceToken(id, agent.id, relation.role);
    return { token, id };
  }
  return {
    error:
      "User is not an admin of this space. Currently, only admins can switch spaces."
  };
}

async function getAllSpaces(body: any, agent: Agent) {
  const query = `return fn::admin::user::fetchSpaces("user:${agent.id}")`;
  const response = await performAdminQuery(query);
  return response[0].result;
}
