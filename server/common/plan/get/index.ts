import { performQueryOnMasterDb } from "$lib/server/surrealHelpers";
import { resolvePlanQuery } from "../plan.utils";

export async function get(userId: string) {
  const query = resolvePlanQuery(userId);
  const response = await performQueryOnMasterDb(query);
  return response;
}
