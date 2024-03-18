import localforage from "localforage";
import {
  CacheStrategy,
  type CacheSource,
  type CacheableStore
} from "../types/data.type";
import { LocalDexie } from "$lib/local/stores/local.dexie";

/**
 * The cache manager for the application.
 */
export class CacheManager implements CacheSource {
  indxDb: LocalForage = localforage.createInstance({ name: "guest" });
  dixie: LocalDexie = new LocalDexie("d:guest");
  initialize() {
    let userId = "guest";
    if (localStorage.getItem("userInfo")) {
      const userInfo = JSON.parse(localStorage.getItem("userInfo")!);
      userId = userInfo.id;
    }
    this.indxDb = localforage.createInstance({
      name: userId
    });
    this.dixie = new LocalDexie("d:" + userId);
  }
  constructor() {
    this.initialize();
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

  cacheStore(
    store: CacheableStore,
    strategy: CacheStrategy | undefined = undefined
  ) {
    if (!strategy || strategy === CacheStrategy.WHOLE) {
      this.indxDb.setItem(store.id, store);
    } else {
      //TODO - merge using id
    }
  }

  async retrieveCache(storeId: string) {
    return (await this.indxDb.getItem(storeId)) as CacheableStore;
  }
}
