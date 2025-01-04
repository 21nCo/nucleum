import { resolveSyncDownQueryV4 } from "../sync.utils";
import { ISyncUpBody } from "$lib/shared/types/sync.type";
import { performQueryOnBehalfOfUser } from "../../user/user";
import { resolveMutationQueryV2 } from "$lib/shared/utils/surreal.utils";
import { Agent } from "$lib/server/common/account/account.type";

export async function syncUp(body: ISyncUpBody, agent: Agent) {
  try {
    const { mutations, lastSyncDown, resources, dapId } = body;
    if (!mutations || !Array.isArray(mutations) || mutations.length < 1) {
      return { error: "No mutations to sync" };
    }
    const fetchBackQuery = resolveSyncDownQueryV4(
      lastSyncDown,
      resources,
      dapId
    );
    let response;
    if (
      mutations.length < 20 &&
      mutations.every(
        (mutation: any) =>
          !mutation.resourceId ||
          typeof mutation.resourceId === "string" ||
          (Array.isArray(mutation.resourceId) &&
            mutation.resourceId.length < 20)
      )
    ) {
      const insertMutationsQuery = `INSERT INTO mutation ${JSON.stringify(
        mutations
      )};`;
      const individualMutationsQuery = mutations
        .map((mutation: any) => resolveMutationQueryV2(mutation))
        .join("; ");
      const masterQuery = `${insertMutationsQuery}; ${individualMutationsQuery}; ${fetchBackQuery};`;
      response = await performQueryOnBehalfOfUser(masterQuery, agent);
    } else {
      console.log({ at: "sync - large mutations found" });
      let mutationResponses = [];
      for (const mutation of mutations) {
        try {
          const insertMutationQuery = `INSERT INTO mutation [${JSON.stringify(
            mutation
          )}];`;
          const mutationInsertResponse = await performQueryOnBehalfOfUser(
            insertMutationQuery,
            agent
          );
          const mutationQuery = resolveMutationQueryV2(mutation);
          const individualMutationResponse = await performQueryOnBehalfOfUser(
            mutationQuery,
            agent
          );
          if (Array.isArray(individualMutationResponse)) {
            mutationResponses.push(...individualMutationResponse);
          } else {
            mutationResponses.push(individualMutationResponse);
          }
        } catch (e) {
          console.error({ at: "syncUp - error", error: e });
          mutationResponses.push({ error: "Sync failed" });
        }
      }
      const fetchBackResponse = await performQueryOnBehalfOfUser(
        fetchBackQuery,
        agent
      );
      mutationResponses.push(...fetchBackResponse);
      response = mutationResponses;
    }
    if (response) return response;
    else return { error: "transaction failed" };
  } catch (e) {
    console.error({ at: "syncUp - error", error: e });
    return { error: "Sync failed" };
  }
}
