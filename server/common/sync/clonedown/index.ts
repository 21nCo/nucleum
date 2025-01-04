import { Agent } from "$lib/server/common/account/account.type";
import { ICloneDownBody } from "$lib/shared/types/sync.type";
import { resolveCloneDownQuery } from "../sync.utils";
import { performQueryOnBehalfOfUser } from "../../user/user";

export async function cloneDown(body: ICloneDownBody, agent: Agent) {
  try {
    const { resources, isExtension } = body;
    if (resources?.length < 1) return { error: "No resources found" };
    const limit = body.limit || 500;
    const query = resolveCloneDownQuery(resources, {
      isExtension,
      limit
    });
    const response = await performQueryOnBehalfOfUser(query, agent);
    return response;
  } catch (e) {
    console.error({ at: "cloneDown - error", error: e });
    return { error: "Sync failed" };
  }
}
