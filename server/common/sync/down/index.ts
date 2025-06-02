import { Agent } from "$lib/server/common/account/account.type";
import { ISyncDownBody } from "$lib/shared/types/sync.type";
import { SyncProviderFactory } from "../providers";

export async function syncDown(body: ISyncDownBody, agent: Agent) {
  const provider = SyncProviderFactory.getProvider();
  return await provider.syncDown(body, agent);
}
