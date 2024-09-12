import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { generateRandomId } from "$lib/shared/utils/crypto.utils";
import { logger } from "../components/debug/logger.client";
import type { IRecordId } from "../types/data.type";
import {
  ClientStorageKey,
  type IPersistence,
  type ISyncDelegate
} from "./persistence.type";
import { clientStorage } from "./persistence.utils";

export class SyncDelegate implements ISyncDelegate {
  persistence: IPersistence;
  constructor(provder: IPersistence) {
    this.persistence = provder;
  }
  mutation(query: string, resourceId?: IRecordId | Resource) {
    try {
      const dapId = clientStorage.get(ClientStorageKey.DAP_ID);
      const userInfo = clientStorage.get(ClientStorageKey.USER_INFO);
      if (!userInfo) return;
      const userId = JSON.parse(userInfo)?.id;
      const mutationId = generateRandomId();
      logger.log({
        at: "SyncDelegate.mutation",
        mutationId,
        query,
        resourceId,
        dapId,
        userId
      });
      return this.persistence.insert(
        [
          {
            id: mutationId,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            query,
            resourceId,
            dapId,
            userId
          }
        ],
        Resource.mutation
      );
    } catch (e) {
      logger.error({ at: "SyncDelegate.mutation", error: e });
    }
  }
}
