import { logger } from "$lib/client/components/debug/logger.client";
import type { ISurrealDatabase } from "$lib/client/types/db.type";
import { ClientStorageKey } from "../persistence.type";
import { clientStorage } from "../persistence.utils";
import { SurrealDatabase } from "../surrealHelper";

export class SurrealSync {
  db: ISurrealDatabase;
  constructor() {
    this.db = new SurrealDatabase();
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
    const dapId = clientStorage.get(ClientStorageKey.DAP_ID);
    const lastSyncedAt = clientStorage.get(ClientStorageKey.LAST_SYNCED_AT);
    const fetchMutationsQuery = `SELECT * FROM mutation WHERE createdAt > '${new Date(+(lastSyncedAt ?? new Date().getTime() - 1000 * 60)).toISOString()}' AND dapId IS NOT '${dapId}';`;
    const masterQuery = `${insertMutationsQuery}; ${individualMutationsQuery}; ${fetchMutationsQuery};`;
    let response = await this.db.query(masterQuery, {});
    logger.debug({ at: "SurrealSync.sync", response });
    if (response && response.length > 0) {
      const reverseSync = response[response.length - 1];
      logger.debug({ at: "SurrealSync.sync - reverseSync", reverseSync });
      if (reverseSync && reverseSync.length > 0) {
        await this.syncToLocal(reverseSync);
      }
    }
  }

  /**
   * TODO
   * @param mutations
   */
  async syncToLocal(mutations: any[]) {}

  async cloneCloudToLocal() {
    clientStorage.set(ClientStorageKey.LAST_SYNCED_AT, new Date().getTime());
  }

  async cloneLocalToCloud() {}
}
