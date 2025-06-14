import { Agent } from "$lib/server/common/account/account.type";
import { ICloneDownBody, ICloneDownv2Body } from "$lib/shared/types/sync.type";
import { SyncProvider, SyncProviderFactory } from "../providers";

export async function cloneDown(body: ICloneDownBody, agent: Agent) {
  const provider = SyncProviderFactory.getProvider();
  const result = await provider.cloneDown(body, agent);
  if (provider.name === SyncProvider.SURREAL || !Array.isArray(result)) {
    return result;
  }
  return result?.map((x) => {
    return {
      result: x
    };
  });
}

export async function cloneDownv2(body: ICloneDownv2Body, agent: Agent) {
  const provider = SyncProviderFactory.getProvider();
  const result = await provider.cloneDownv2(body, agent);
  return result;
}
