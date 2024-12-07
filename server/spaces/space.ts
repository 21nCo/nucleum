import { initializeDatabase } from "../common/account";
import { performQueryOnMasterDb } from "../surrealHelpers";
import { generateSpaceToken } from "../common/auth/auth.utils";
import {
  Agent,
  CONTEXT,
  MemberRole,
  SpaceAction
} from "../common/account/account.type";

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
  const response = await performQueryOnMasterDb(query);
  const id = response[0].result[0].id.split("space:")[1];
  await initializeDatabase(id, {
    scope: CONTEXT.SPACE,
    host: context.host
  });
  //TODO region for token generation
  const token = await generateSpaceToken({
    database: id,
    principal: agent.id,
    role: MemberRole.ADMIN
  });
  return { token, id };
}

async function switchSpace(body: any, agent: Agent) {
  const { id } = body;
  const query = `return fn::admin::space::fetchUser("space:${id}", "user:${agent.id}")`;
  const response = await performQueryOnMasterDb(query);
  const relation = response[0].result.relation;
  //TODO - send region for token generation
  if (relation.role === MemberRole.ADMIN) {
    const token = await generateSpaceToken({
      database: id,
      principal: agent.id,
      role: MemberRole.ADMIN
    });
    return { token, id };
  }
  return {
    error:
      "User is not an admin of this space. Currently, only admins can switch spaces."
  };
}

async function getAllSpaces(body: any, agent: Agent) {
  const query = `return fn::admin::user::fetchSpaces("user:${agent.id}")`;
  const response = await performQueryOnMasterDb(query);
  return response[0].result;
}
