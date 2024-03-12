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
  type CacheableStoreContract
} from "../types/store.type";
import localforage from "localforage";
import { resolveRefreshQuery } from "../utils/surreal.utils";

export const dataManager = init();
const surrealDb = new SurrealDatabase();
let userId = "guest";
if (localStorage.getItem("userInfo")) {
  const userInfo = JSON.parse(localStorage.getItem("userInfo")!);
  userId = userInfo.id;
}
const indxDb = localforage.createInstance({
  name: userId
});
const allItems = Object.values(Item);

function init() {
  const { subscribe, set, update } = writable();
  return {
    subscribe,
    set,
    update,
    fetchAll: () => {},
    refreshAllThatAreStale: refreshStale,
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
      cacheStore(store, strategy);
    },
    retrieveCache: retrieveCache,
    initialize: async () => {
      const clientMutationMap = await fetchClientMutationMap();
      if (!clientMutationMap) {
        let seedMutationMap: any = {};
        allItems.forEach((item) => {
          seedMutationMap[item] = 1;
        });
        await updateClientMutationMap(seedMutationMap);
        let serverSeed: any = {};
        allItems.forEach((item) => {
          serverSeed[item] = +(new Date().getTime() / 1000).toFixed();
        });
        await surrealDb.query(`update kv:mutationMap merge $map`, {
          map: serverSeed
        });
      }
      refreshStale();
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
    serverMutationMap = { ...serverMutationMap, ...result.forRecords };
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
async function refreshStale() {
  const serverMutationMap = await fetchServerMutationMap();
  const clientMutationMap: any = await fetchClientMutationMap();
  console.log({ clientMutationMap, serverMutationMap });
  if (!clientMutationMap || !serverMutationMap) return;
  const storesThatNeedRefresh = await resolveStoresThatNeedRefresh(
    clientMutationMap,
    serverMutationMap
  );
  if (!isValidArrayWithData(storesThatNeedRefresh)) return;
  appStore.log("Stale data found. Refreshing stores");
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
  mergeMutationMap(clientMutationMap, serverMutationMap);
}
/**
 * Retrieves the client mutation map.
 * @returns the client mutation map.
 */
function fetchClientMutationMap() {
  return indxDb.getItem("mutationMap");
}

function mergeMutationMap(
  clientMutationMap: Record<string, any>,
  serverMutationMap: Record<string, any>
) {
  let updatedMap: Record<string, any> = Object.keys(clientMutationMap).reduce(
    (acc: Record<string, any>, key) => {
      if (serverMutationMap[key] > clientMutationMap[key]) {
        acc[key] = serverMutationMap[key];
      } else {
        acc[key] = clientMutationMap[key];
      }
      return acc;
    },
    {}
  );
  updateClientMutationMap(updatedMap);
}

function updateClientMutationMap(map: any) {
  return indxDb.setItem("mutationMap", map);
}

function cacheStore(
  store: CacheableStore,
  strategy: CacheStrategy | undefined = undefined
) {
  if (!strategy || strategy === CacheStrategy.WHOLE) {
    indxDb.setItem(store.id, store);
  } else {
    //TODO - merge using id
  }
}

async function retrieveCache(storeId: string) {
  return (await indxDb.getItem(storeId)) as CacheableStore;
}
