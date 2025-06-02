import { ISyncUpBody } from "$lib/shared/types/sync.type";
import { Agent } from "$lib/server/common/account/account.type";
import { SyncProviderFactory } from "../providers";

export async function syncUp(body: ISyncUpBody, agent: Agent) {
  const provider = SyncProviderFactory.getProvider();
  return await provider.syncUp(body, agent);
}
