import { logger } from "$lib/client/components/debug/logger.client";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  PersistenceActionType,
  type IMutation
} from "$lib/client/types/data.type";
import type { ISurrealDatabase } from "$lib/client/types/db.type";
import { isExtensionEnvironment } from "$lib/client/utils/browser.utils";
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
    const dapIdVal = await clientStorage.get(ClientStorageKey.DAP_ID);
    if (!dapIdVal) return;
    const lastSyncDown = await clientStorage.get(
      ClientStorageKey.LAST_SYNC_DOWN
    );
    logger.log({ at: "resolveSyncDownQuery", lastSyncDown });
    let timestamp = lastSyncDown ?? 0;
    return `SELECT * FROM mutation WHERE timestamp > ${timestamp} AND dapId IS NOT '${dapIdVal}' ORDER BY timestamp ASC;`;
  }

  async syncDown() {
    const fetchMutationsQuery = await this.resolveSyncDownQuery();
    if (!fetchMutationsQuery) return;
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
      if (!isExtensionEnvironment()) {
        resources.forEach((resource) => {
          query += `select *, meta::id(id) as id from ${resource};`;
        });
      } else {
        resources.forEach((resource) => {
          query += `select * from ${resource};`;
        });
      }
    }
    const result = await this.remote.query(query, {});
    logger.log({ at: "cloneCloudToLocal", result });
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
