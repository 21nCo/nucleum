import { IReconcileBody } from "$lib/shared/types/sync.type";

import { performQueryOnBehalfOfUser } from "../../user/user";
import { Agent } from "$lib/server/common/account/account.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { commonQueryReplacements } from "$lib/shared/utils/surreal.utils";

export async function reconcile(body: IReconcileBody, agent: Agent) {
  try {
    const { resources, isExtension } = body;
    for (const resource of resources) {
      switch (resource) {
        case Resource.node:
          await runReconciliationForNodeResource();
          break;
      }
    }
    return { success: true };
  } catch (e) {
    console.error({ at: "reconcile - error", error: e });
    return { error: "Sync failed" };
  }

  async function runReconciliationForNodeResource() {
    try {
      const query = "select value id from node where contentType is NONE";
      const response = await performQueryOnBehalfOfUser(query, agent);
      if (
        response &&
        Array.isArray(response) &&
        response.length > 0 &&
        response[0].result
      ) {
        const badData = response[0].result;
        // console.log({
        //   at: "reconcile - badData",
        //   agentId: agent.id,
        //   badData: JSON.stringify(badData)
        // });
        const deleteQuery = commonQueryReplacements(
          `DELETE FROM node where id in ${JSON.stringify(badData)}`
        );
        // console.log({ at: "reconcile - deleteQuery", deleteQuery });
        const deleteResponse = await performQueryOnBehalfOfUser(
          deleteQuery,
          agent
        );
        // console.log({ at: "reconcile - deleteResponse", deleteResponse });
      }
    } catch (e) {
      console.error({ at: "reconcile - node - error", error: e });
      return { error: "Sync failed" };
    }
  }
}
