import { logger } from "$lib/client/components/debug/logger.client";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
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
  constructor(remote: ISurrealDatabase) {
    this.remote = remote;
  }

  /**
   * TODO: Checking the mutation run status on cloud - and updating on local record status.
   * @param mutations
   */
  async sync(
    mutations: IMutation[],
    lastSyncDown: number,
    resources: Resource[],
    dapId: string
  ) {
    logger.log({
      at: "SurrealSync.sync",
      mutations,
      lastSyncDown
    });
    const insertMutationsQuery = `INSERT INTO mutation ${JSON.stringify(mutations)};`;
    const individualMutationsQuery = mutations
      .map((mutation: any) => resolveMutationQueryV2(mutation))
      .join("; ");
    const fetchMutationsQuery = await this.resolveSyncDownQuery(
      lastSyncDown,
      resources,
      dapId
    );
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
        return syncDownData.result;
      }
    }
    return [];
  }

  private async resolveSyncDownQuery(
    lastSyncDown: number,
    resources: Resource[],
    dapId: string
  ) {
    logger.log({ at: "resolveSyncDownQuery", lastSyncDown, resources });
    return `SELECT * FROM mutation WHERE timestamp > ${lastSyncDown} AND dapId IS NOT '${dapId}' AND resource IN [${resources.map((x) => `'${x}'`).join(",")}] ORDER BY timestamp ASC;`;
  }

  async syncDown(lastSyncDown: number, resources: Resource[], dapId: string) {
    const fetchMutationsQuery = await this.resolveSyncDownQuery(
      lastSyncDown,
      resources,
      dapId
    );
    if (!fetchMutationsQuery) return;
    let response = await this.remote.query(fetchMutationsQuery, {});
    logger.log({ at: "SurrealSync.syncDown", response });
    if (
      response &&
      Array.isArray(response) &&
      response.length > 0 &&
      response[0].result
    ) {
      return response[0].result;
    }
    return [];
  }

  /**
   * TODO - high volume data scenario, graph links scenario
   * @param resources
   */
  async cloneCloudToLocal(params: {
    resources: Resource[];
    isExtension?: boolean;
  }) {
    logger.log({ at: "cloneCloudToLocal", resources: params.resources });
    let query = "";
    // resources = ["collection", "node", "file", "property", "view", "kv"];

    if (params?.resources?.length > 0) {
      if (!params?.isExtension) {
        params.resources.forEach((resource) => {
          query += `select *, meta::id(id) as id from ${resource};`;
        });
      } else {
        params.resources.forEach((resource) => {
          query += `select * from ${resource};`;
        });
      }
    }
    const result = await this.remote.query(query, {});
    logger.log({ at: "cloneCloudToLocal", result });
    return result;
  }

  /**
   * TODO - high volume data scenario
   * @param resources
   */
  async cloneLocalToCloud(resource: Resource, records: any[]) {
    logger.log({ at: "cloneLocalToCloud", resource, records });
    return this.remote.insert(resource, records);
  }
}
