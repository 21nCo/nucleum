import { performQueryOnMasterDb } from "$lib/server/surrealHelpers";

export async function get(userId: string) {
  const query = `select id, userPlan.* as userPlan from user:${userId};`;
  const response = await performQueryOnMasterDb(query);
  return response;
}
