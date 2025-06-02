import { Agent } from "$lib/server/common/account/account.type";
import { ICloneDownBody } from "$lib/shared/types/sync.type";
import { SyncProviderFactory } from "../providers";

export async function cloneDown(body: ICloneDownBody, agent: Agent) {
  const provider = SyncProviderFactory.getProvider();
  return await provider.cloneDown(body, agent);
}
