import { IActivity } from "./common/account/account.type";
import { DatabaseProviderFactory } from "$lib/server/database/providers";

export async function log(userId: string, context: IActivity) {
  const provider = DatabaseProviderFactory.getProvider();
  const response = await provider.log(userId, context);
  return response;
}
