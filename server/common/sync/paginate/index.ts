import { Agent } from "$lib/server/common/account/account.type";
import { ICloneDownPaginateBody } from "$lib/shared/types/sync.type";
import { resolveCloneDownPaginateQuery } from "../sync.utils";
import { performQueryOnBehalfOfUser } from "../../user/user";

/**
 * TODO - Implement streaming or download via S3 if too many records - as AWS Lambda has a limit of 6MB for response size
 * @param body
 * @param agent
 * @returns
 */
export async function paginate(body: ICloneDownPaginateBody, agent: Agent) {
  try {
    const { resource, offset, limit, isExtension } = body;
    const query = resolveCloneDownPaginateQuery(resource, {
      offset,
      limit,
      isExtension
    });
    const response = await performQueryOnBehalfOfUser(query, agent);
    return response;
  } catch (e) {
    console.error({ at: "cloneDownPaginate - error", error: e });
    return { error: "Sync failed" };
  }
}
