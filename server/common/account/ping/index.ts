import { DatabaseProviderFactory } from "$lib/server/database/providers";

export async function ping(userId: string, context: any) {
  const provider = DatabaseProviderFactory.getProvider();
  const userPlanResponse = await provider.getUserAndPlan(userId);
  const logResponse = await provider.log(userId, {
    ...context,
    activity: "ping"
  });
  return [{ result: userPlanResponse }, logResponse];
}
