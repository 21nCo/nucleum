import { performQueryOnMasterDb } from "$lib/server/surrealHelpers";

export async function ping(userId: string, context: any) {
  const timestamp = new Date().toISOString();
  const query = `select id, userPlan.* as userPlan from user:${userId}; create activity set userId = user:${userId}, timestamp = "${timestamp}", context = ${JSON.stringify(
    context
  )}`;
  const response = await performQueryOnMasterDb(query);
  return response;
}
