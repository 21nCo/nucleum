import { performQueryOnMasterDb } from "./surrealHelpers";

export async function log(userId: string, context: any) {
  const timestamp = new Date().toISOString();
  const query = `select id from user:${userId}; create activity set userId = user:${userId}, timestamp = "${timestamp}", context = ${JSON.stringify(
    context
  )}`;
  const response = await performQueryOnMasterDb(query);
  return response;
}
