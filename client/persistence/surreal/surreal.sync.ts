import { logger } from "$lib/client/components/debug/logger.client";
import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  PersistenceActionType,
  type IMutation
} from "$lib/client/types/data.type";
import type { ISurrealDatabase } from "$lib/client/types/db.type";
import {
  ClientStorageKey,
  type IPersistence,
  type ISyncHandler
} from "../persistence.type";
import { clientStorage } from "../persistence.utils";
import { resolveMutationQueryV2 } from "./surreal.utils";

export class SurrealSync implements ISyncHandler {
  remote: ISurrealDatabase;
  local: IPersistence;
  constructor(local: IPersistence, remote: ISurrealDatabase) {
    this.remote = remote;
    this.local = local;
  }

  /**
   * TODO: Checking the mutation run status on cloud - and updating on local record status.
   * @param mutations
   */
  async sync(mutations: IMutation[]) {
    logger.log({ at: "SurrealSync.sync", mutations });
    const insertMutationsQuery = `INSERT INTO mutation ${JSON.stringify(mutations)};`;
    const individualMutationsQuery = mutations
      .map((mutation: any) => resolveMutationQueryV2(mutation))
      .join("; ");
    const fetchMutationsQuery = await this.resolveSyncDownQuery();
    const masterQuery = `${insertMutationsQuery}; ${individualMutationsQuery}; ${fetchMutationsQuery};`;
    let response = await this.remote.query(masterQuery, {});
    logger.log({ at: "SurrealSync.sync", response, masterQuery });
    if (response && response.length > 0) {
      const syncDownData = response[response.length - 1];
      logger.log({
        at: "SurrealSync.sync - syndownData",
        syncDownData
      });
      if (syncDownData?.result && syncDownData.result.length > 0) {
        await this.processSyncDown(syncDownData.result);
      }
    }
  }

  async processSyncDown(mutations: IMutation[]) {
    logger.log({ at: "processSyncDown", mutations });
    if (!mutations || mutations.length === 0) return;
    for (let mutation of mutations) {
      await this.local.mutation(mutation.resource as Resource, mutation.params);
    }
    return mutations;
  }

  private async resolveSyncDownQuery() {
    const dapId = await clientStorage.get(ClientStorageKey.DAP_ID);
    const lastSyncedAt = await clientStorage.get(
      ClientStorageKey.LAST_SYNCED_AT
    );
    return `SELECT * FROM mutation WHERE createdAt > '${new Date(+(lastSyncedAt ?? new Date().getTime() - 1000 * 60)).toISOString()}' AND dapId IS NOT '${dapId}';`;
  }

  async syncDown() {
    const fetchMutationsQuery = await this.resolveSyncDownQuery();
    let response = await this.remote.query(fetchMutationsQuery, {});
    logger.log({ at: "SurrealSync.syncDown", response });
    if (
      response &&
      response.length > 0 &&
      response[0].result &&
      response[0].result.length > 0
    ) {
      return this.processSyncDown(response[0].result);
    }
  }

  /**
   * TODO - high volume data scenario, graph links scenario
   * @param resources
   */
  async cloneCloudToLocal(resources: string[]) {
    logger.log({ at: "cloneCloudToLocal", resources });
    let query = "";
    // resources = ["collection", "node", "file", "property", "view", "kv"];
    if (resources?.length > 0) {
      resources.forEach((resource) => {
        query += `select *, meta::id(id) as id from ${resource};`;
      });
    }
    const result = await this.remote.query(query, {});
    logger.debug({ at: "cloneCloudToLocal", result });
    for (let i = 0; i < result.length; i++) {
      const resource = resources[i];
      const resourceResponse = result[i];
      if (resourceResponse.result && resourceResponse.result.length > 0) {
        await this.local.mutation(resource as Resource, {
          records: resourceResponse.result,
          action: PersistenceActionType.INSERT
        });
      }
    }
  }

  /**
   * TODO - high volume data scenario
   * @param resources
   */
  async cloneLocalToCloud(resources: string[]) {
    logger.log({ at: "cloneLocalToCloud", resources });
    for (let resource of resources) {
      const records = await this.local.selectMany(resource as Resource);
      await this.remote.insert(resource, records);
    }
  }
}
