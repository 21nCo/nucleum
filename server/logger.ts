import { performAdminQuery } from "./surrealHelpers";

export async function log(userId: string, context: any) {
  const timestamp = new Date().toISOString();
  const query = `create activity set userId = "user:${userId}", timestamp = "${timestamp}", context = ${JSON.stringify(
    context
  )}`;
  const response = await performAdminQuery(query);
  return response;
}
