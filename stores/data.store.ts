import { SurrealDatabase } from "$lib/tidy/access/surrealHelper";
import { appStore, cacheableStoresTable } from "$lib/tidy/stores/app.store";
import { get, writable } from "svelte/store";
import { Item } from "../types/item.enum";
import { checkSurrealResponse, interceptSurrealResponse } from "../utils/utils";
import { isValidArrayWithData } from "../utils/obj.utils";
import {
  CacheStrategy,
  StoreDataType,
  type CacheableStore,
  type CacheableStoreContract,
  type DataManager
} from "../types/store.type";

import { resolveRefreshQuery } from "../utils/surreal.utils";
import { CacheManager } from "./cache";
import { logger } from "./log.store";

export const dataManager = init();
const surrealDb = new SurrealDatabase();

const allItems = Object.values(Item);

function init() {
  const cacheSource = new CacheManager();
  cacheSource.initialize();
  const { subscribe, set, update } = writable<DataManager>({ cacheSource });
  return {
    subscribe,
    set,
    update,
    fetchAll: () => {},
    refreshStaleData: refreshStaleData,
    search: async (storeId: string, query: string) => {
      const store = cacheableStoresTable.find((x) => get(x).id === storeId);
      if (store) {
        return store.search?.(query);
      }
    },
    refresh: async (storeId: string) => {
      const store = cacheableStoresTable.find((x) => get(x).id === storeId);
      if (store) {
        const storeData = get(store);
        if (storeData.refreshQuery) {
          const x = await surrealDb.executeReadFn(storeData.refreshQuery);
          const data = interceptSurrealResponse(x);
          if (data) {
            store.loader(data);
          }
        }
      }
    },
    cache: (store: CacheableStore) => {
      let strategy = store.cacheStrategy;
      const cacheSource = get(dataManager).cacheSource;
      if (!strategy) {
        if (
          store.dataType === StoreDataType.KVO ||
          store.dataType === StoreDataType.FIR ||
          store.id.startsWith("kv:")
        ) {
          strategy = CacheStrategy.WHOLE;
        } else {
          strategy = CacheStrategy.MERGE_RECORDS;
        }
      }
      cacheSource.cacheStore(store, strategy);
    },
    retrieveCache: async (storeId: string) => {
      const cacheSource = get(dataManager).cacheSource;
      return await cacheSource.retrieveCache(storeId);
    },
    initialize: async () => {
      update((x) => {
        x.cacheSource = new CacheManager();
        return x;
      });
      const cacheSource = get(dataManager).cacheSource;
      let seedMutationMap: any = {};
      allItems.forEach((item) => {
        seedMutationMap[item] = 1;
      });
      const result = await cacheSource.mergeClientMutationMap(seedMutationMap);
      logger.log({ context: "dataManager.initialize", result });
      let serverSeed: any = {};
      allItems.forEach((item) => {
        serverSeed[item] = +(new Date().getTime() / 1000).toFixed();
      });
      await surrealDb.query(`return fn::global::mergeMutationMap($map);`, {
        map: serverSeed
      });
      refreshStaleData();
    }
  };
}

async function fetchServerMutationMap() {
  const appName = get(appStore).product;
  let serverMutationMap: any = {};
  const response = await surrealDb.executeReadFn(
    "return fn::global::fetchMutationMap();",
    {
      app: appName
    }
  );
  const result = interceptSurrealResponse(response);
  if (result.forObjects) {
    result.forObjects.forEach((element: any) => {
      serverMutationMap[element.id] = element.modifiedAt;
    });
  }
  if (result.forRecords) {
    serverMutationMap = { ...result.forRecords, ...serverMutationMap };
  }
  return serverMutationMap;
}

/**
 * Resolves the stores that need to be refreshed.
 * @returns a list of stores that need to be refreshed.
 */
async function resolveStoresThatNeedRefresh(
  clientMutationMap: any,
  serverMutationMap: any
) {
  let storesThatNeedRefresh: CacheableStoreContract[] = [];
  allItems.forEach((item) => {
    const clientVersion = clientMutationMap[item];
    const serverVersion = serverMutationMap[item];
    if (clientVersion && serverVersion) {
      if (clientVersion < serverVersion) {
        console.log(
          `${item} dependant stores needs refresh - ${clientVersion} < ${serverVersion}`
        );
        const stores = cacheableStoresTable.filter((x) => {
          let store = get(x);
          if (!store.dependencies) {
            return (
              (store.dataType === StoreDataType.FIR && item === store.id) ||
              (store.dataType === StoreDataType.KVO &&
                store.id.split(":")[1] === item)
            );
          } else return store.dependencies.some((y: any) => y === item);
        });
        storesThatNeedRefresh.push(...stores);
      }
    }
  });
  return storesThatNeedRefresh;
}

/**
 * Performs a refresh of the data stores that are out of sync with the server.
 * @returns true if the refresh was successful, false otherwise.
 */
async function refreshStaleData() {
  const serverMutationMap = await fetchServerMutationMap();
  const cacheSource = get(dataManager).cacheSource;
  const clientMutationMap: any = await cacheSource.fetchClientMutationMap();
  console.log({ clientMutationMap, serverMutationMap });
  if (!clientMutationMap || !serverMutationMap) return;
  const storesThatNeedRefresh = await resolveStoresThatNeedRefresh(
    clientMutationMap,
    serverMutationMap
  );
  if (!isValidArrayWithData(storesThatNeedRefresh)) return;
  logger.log("Stale data found. Refreshing stores");
  const queries = storesThatNeedRefresh.map((x: CacheableStoreContract) => {
    const store = get(x) as CacheableStore;
    if (store?.refreshQuery) return store.refreshQuery;
    else return resolveRefreshQuery(store.id, store.dataType);
  });
  let response = await surrealDb.executeReadFn(queries.join(";"));
  if (!isValidArrayWithData(response)) return;
  response = response.map((x: any) => checkSurrealResponse(x));
  for (let i = 0; i < storesThatNeedRefresh.length; i++) {
    const store = storesThatNeedRefresh[i];
    const data = response[i];
    if (store.loader && data) {
      store.loader(data);
    }
  }
  cacheSource.mergeClientMutationMap(clientMutationMap, serverMutationMap);
}
