import { DatabaseProviderFactory } from "$lib/server/database/providers";

export async function get(userId: string) {
  const provider = DatabaseProviderFactory.getProvider();
  const response = await provider.getUserAndPlan(userId);
  return [{ result: response }];
}
