import { Agent } from "$lib/server/common/account/account.type";
import { ICloneUpBody } from "$lib/shared/types/sync.type";
import { performQueryOnBehalfOfUser } from "../../user/user";
import { resolveInsertQuery } from "$lib/shared/utils/surreal.utils";

export async function cloneUp(body: ICloneUpBody, agent: Agent) {
  try {
    const { resource, records } = body;
    const query = resolveInsertQuery(resource, records);
    const response = await performQueryOnBehalfOfUser(query, agent);
    return response;
  } catch (e) {
    console.error({ at: "cloneUp - error", error: e });
    return { error: "Sync failed" };
  }
}
