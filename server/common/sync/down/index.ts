import { resolveCountQuery } from "../sync.utils";
import { Agent } from "$lib/server/common/account/account.type";
import { ISyncDownBody } from "$lib/shared/types/sync.type";
import { resolveSyncDownQueryV4 } from "../sync.utils";
import { performQueryOnBehalfOfUser } from "../../user/user";

export async function syncDown(body: ISyncDownBody, agent: Agent) {
  try {
    const { lastSyncDown, resources, dapId } = body;
    if (!resources || resources?.length < 1)
      return { error: "No resources found" };
    const fetchBackQuery = resolveSyncDownQueryV4(
      lastSyncDown,
      resources,
      dapId
    );
    const countQuery = resolveCountQuery(resources);
    const fullQuery = `${fetchBackQuery}; ${countQuery};`;
    if (!fullQuery) return { error: "transaction failed" };
    const response = await performQueryOnBehalfOfUser(fullQuery, agent);
    return response;
  } catch (e) {
    console.error({ at: "syncDown - error", error: e });
    return { error: "Sync failed" };
  }
}
