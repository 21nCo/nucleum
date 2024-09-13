import { logger } from "$lib/client/components/debug/logger.client";
import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import type { ISurrealDatabase } from "$lib/client/types/db.type";
import {
  ClientStorageKey,
  type IPersistence,
  type ISyncHandler
} from "../persistence.type";
import { clientStorage } from "../persistence.utils";
import { SurrealDatabase } from "../surrealHelper";

export class SurrealSync implements ISyncHandler {
  remote: ISurrealDatabase;
  local: IPersistence;
  constructor(local: IPersistence) {
    this.remote = new SurrealDatabase();
    this.local = local;
  }

  /**
   * TODO: Checking the mutation run status on cloud - and updating on local record status.
   * @param mutations
   */
  async sync(mutations: any[]) {
    const insertMutationsQuery = `INSERT INTO mutation ${JSON.stringify(mutations)};`;
    const individualMutationsQuery = mutations
      .map((mutation: any) => mutation.query)
      .join("; ");
    const fetchMutationsQuery = this.resolveSyncDownQuery();
    const masterQuery = `${insertMutationsQuery}; ${individualMutationsQuery}; ${fetchMutationsQuery};`;
    let response = await this.remote.query(masterQuery, {});
    logger.debug({ at: "SurrealSync.sync", response, masterQuery });
    if (response && response.length > 0) {
      const syncDownData = response[response.length - 1];
      logger.debug({
        at: "SurrealSync.sync - syndownData",
        syncDownData
      });
      if (syncDownData?.result && syncDownData.result.length > 0) {
        await this.processSyncDown(syncDownData.result);
      }
    }
  }

  /**
   * TODO
   * @param mutations
   */
  async processSyncDown(mutations: any[]) {
    logger.debug({ at: "processSyncDown", mutations });
    if (!mutations || mutations.length === 0) return;
    const query = mutations.map((m) => m.query).join("; ");
    logger.debug({ at: "processSyncDown", query });
    if (!query) return;
    await this.local.query(query, {});
  }

  private resolveSyncDownQuery() {
    const dapId = clientStorage.get(ClientStorageKey.DAP_ID);
    const lastSyncedAt = clientStorage.get(ClientStorageKey.LAST_SYNCED_AT);
    return `SELECT * FROM mutation WHERE createdAt > '${new Date(+(lastSyncedAt ?? new Date().getTime() - 1000 * 60)).toISOString()}' AND dapId IS NOT '${dapId}';`;
  }

  async syncDown() {
    const fetchMutationsQuery = this.resolveSyncDownQuery();
    let response = await this.remote.query(fetchMutationsQuery, {});
    logger.debug({ at: "SurrealSync.syncDown", response });
    if (
      response &&
      response.length > 0 &&
      response[0].result &&
      response[0].result.length > 0
    ) {
      await this.processSyncDown(response[0].result);
    }
  }

  /**
   * TODO - high volume data scenario, graph links scenario
   * @param resources
   */
  async cloneCloudToLocal(resources: string[]) {
    logger.debug({ at: "cloneCloudToLocal", resources });
    let query = "";
    if (resources?.length > 0) {
      resources.forEach((resource) => {
        query += `select * from ${resource};`;
      });
    }
    const result = await this.remote.query(query, {});
    logger.debug({ at: "cloneCloudToLocal", result });
    for (let i = 0; i < result.length; i++) {
      const resource = resources[i];
      const resourceResponse = result[i];
      if (resourceResponse.result && resourceResponse.result.length > 0) {
        await this.local.insert(resourceResponse.result, resource as Resource);
      }
    }
  }

  /**
   * TODO - high volume data scenario
   * @param resources
   */
  async cloneLocalToCloud(resources: string[]) {
    logger.debug({ at: "cloneLocalToCloud", resources });
    for (let resource of resources) {
      const records = await this.local.selectMany(resource as Resource);
      await this.remote.insert(resource, records);
    }
  }
}
