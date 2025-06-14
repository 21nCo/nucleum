import { Agent } from "$lib/server/common/account/account.type";
import { ICloneDownPaginateBody } from "$lib/shared/types/sync.type";
import { SyncProvider, SyncProviderFactory } from "../providers";

/**
 * TODO - Implement streaming or download via S3 if too many records - as AWS Lambda has a limit of 6MB for response size
 * @param body
 * @param agent
 * @returns
 */
export async function paginate(body: ICloneDownPaginateBody, agent: Agent) {
  const provider = SyncProviderFactory.getProvider();
  const result = await provider.paginate(body, agent);
  if (provider.name === SyncProvider.SURREAL || !result.data) {
    return result;
  }
  return [
    {
      result: result.data,
      ...result
    }
  ];
}
