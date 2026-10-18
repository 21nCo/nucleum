import { logger } from "@nucleum/client/runtime/logging/logger";
import { DatafnExtensionMethod } from "@nucleum/extensions/extension.store";
import { extensionDatafn } from "@nucleum/extensions/extension.store";
import { Resource } from "@nucleum/datafn/resource.enum";
import type { OmitForCaptureWithId } from "@nucleum/datafn/resource.type";
import { type IKindleBook, type IKindleHighlight } from "@nucleum/features/memory/node/node.type";
import { ObservableStore } from "@nucleum/datafn/observable-store";
import { get } from "svelte/store";
import { type ISyncStore, SyncStatus } from "@nucleum/extensions/clipper/contentScripts/types";

import { insertNodeRecords } from "@nucleum/extensions/clipper/contentScripts/record-operations";

class SyncStore extends ObservableStore<ISyncStore> {
  constructor() {
    super(Resource.clipperSync);
    this.set({
      id: undefined,
      status: SyncStatus.NOT_SYNCED,
      isShowSyncPane: false
    });
  }
  async init(id: string) {
    this.update((n) => {
      n.id = id;
      return n;
    });
    await this.refreshSyncState();
    this.update((n) => {
      n.isShowSyncPane = true;
      return n;
    });
  }

  togglePane() {
    this.update((n) => {
      n.isShowSyncPane = !n.isShowSyncPane;
      return n;
    });
  }

  async save(items: OmitForCaptureWithId<IKindleBook | IKindleHighlight>[]) {
    logger.log({ at: "syncStore save", itemCount: items?.length ?? 0 });
    if (!items || items.length < 1) return;
    const limitCount = 300;
    this.update((n) => {
      n.progress = 0;
      return n;
    });
    if (items.length > limitCount) {
      const chunks = resolveChunks();
      logger.log({ at: "syncStore save", chunkCount: chunks.length });
      for (const chunk of chunks) {
        await chunk();
        this.update((n) => {
          n.progress = ((chunks.indexOf(chunk) + 1) / chunks.length) * 100;
          return n;
        });
      }
    } else {
      await insertNodeRecords(items);
    }
    this.update((n) => {
      n.progress = 100;
      return n;
    });
    function resolveChunks(): (() => Promise<any>)[] {
      const chunks: (() => Promise<any>)[] = [];
      for (let i = 0; i < items.length; i += limitCount) {
        chunks.push(() => insertNodeRecords(items.slice(i, i + limitCount)));
      }
      return chunks;
    }
  }

  async updateSyncStatus(status: SyncStatus, message?: string) {
    this.update((n) => {
      n.status = status;
      n.message = message;
      return n;
    });
    if (status === SyncStatus.SYNCED) {
      this.update((n) => {
        n.lastSyncedAt = new Date().toISOString();
        return n;
      });
      await this.persistSyncStatus(status);
    }
  }

  async refreshSyncState() {
    try {
      const id = this.get().id;
      const result = await extensionDatafn({
        method: DatafnExtensionMethod.SELECT,
        args: {
          resourceId: "kv:clipperSync"
        }
      });
      logger.log({ at: "syncStore refreshSyncState", result, id });
      if (result) {
        const record = result;
        if (record[id]) {
          this.update((n) => {
            n.status = record[id].status;
            n.lastSyncedAt = record[id].updatedAt;
            return n;
          });
        }
      }
    } catch (e) {
      logger.error(e);
    }
  }

  async persistSyncStatus(status: SyncStatus) {
    try {
      const id = this.get().id;
      if (!id) return;
      await extensionDatafn({
        method: DatafnExtensionMethod.KV_MERGE,
        args: {
          resource: Resource.clipperSync,
          data: {
            [id]: {
              status,
              updatedAt: new Date().toISOString()
            }
          }
        }
      });
    } catch (e) {
      logger.error(e);
    }
  }
}

export const syncStore = new SyncStore();
