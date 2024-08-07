import localForage from "localforage";
import {
  CacheStrategy,
  type CacheSource,
  type IStore
} from "../types/data.type";
import { LocalDexie } from "$local/local";
import { resolveCurrentUserId } from "../utils/account.utils";

/**
 * The cache manager for the application.
 */
export class CacheManager implements CacheSource {
  indxDb: LocalForage = localForage.createInstance({ name: "guest" });
  dexie: LocalDexie = new LocalDexie("d:guest");
  async initialize() {
    let userId = await resolveCurrentUserId();
    if(!userId) userId = "guest";
    this.indxDb = localForage.createInstance({
      name: userId
    });
    this.dexie = new LocalDexie("d:" + userId);
  }
  /**
   * Retrieves the client mutation map.
   * @returns the client mutation map.
   */
  async fetchClientMutationMap() {
    return this.indxDb.getItem<Record<string, number>>("mutationMap");
  }

  async mergeClientMutationMap(
    newMap: Record<string, number>,
    existingMap?: Record<string, number> | null
  ) {
    if (!existingMap) existingMap = await this.fetchClientMutationMap();
    if (!existingMap) existingMap = {};
    let updatedMap: Record<string, number> = Object.keys(existingMap).reduce(
      (acc: Record<string, number>, key) => {
        if (!newMap[key]) return acc;
        else if (newMap[key] > existingMap![key]) {
          acc[key] = newMap[key];
        } else {
          acc[key] = existingMap![key];
        }
        return acc;
      },
      {}
    );
    Object.keys(newMap).forEach((key: string) => {
      if (!existingMap![key]) {
        updatedMap[key] = newMap[key];
      }
    });
    return this.updateClientMutationMap(updatedMap);
  }

  async updateClientMutationMap(map: any) {
    return this.indxDb.setItem<Record<string, number>>("mutationMap", map);
  }

  cacheKvStore(id: string, data: any) {
    this.indxDb.setItem(id, data);
  }

  async retrieveKvCache(storeId: string) {
    return (await this.indxDb.getItem(storeId)) as IStore;
  }

  async clearCache() {
    try {
      await this.dexie.transaction("rw", this.dexie.tables, async () => {
        await Promise.all(this.dexie.tables.map((table) => table.clear()));
      });
      console.log("Dexie database cleared successfully");
      this.indxDb
        .clear()
        .then(() => {
          console.log("LocalForage data cleared successfully.");
        })
        .catch((error) => {
          console.error("Failed to clear LocalForage:", error);
        });
    } catch (error) {
      console.error("Failed to clear database:", error);
    }
  }
}
