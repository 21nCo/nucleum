import { DatabaseProviderFactory } from "$lib/server/database/providers";
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
  const provider = DatabaseProviderFactory.getProvider();
  const response = await provider.createSpace(name, agent.id);
  const id = response[0].result[0].id.split("space:")[1];
  await provider.initializeUserDb(id, {
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
  const provider = DatabaseProviderFactory.getProvider();
  const response = await provider.getSpaceUser(id, agent.id);
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
  const provider = DatabaseProviderFactory.getProvider();
  const response = await provider.getUserSpaces(agent.id);
  return response[0].result;
}
