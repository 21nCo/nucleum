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
  type DataManager,
  type ResourceDependency,
  DependencySyncType,
  PersistanceActionType
} from "../types/data.type";

import {
  replaceParams,
  mutationQuery,
  resolveRefreshQuery
} from "../utils/surreal.utils";
import { CacheManager } from "./cache";
import { logger } from "./log.store";

export const dataManager = init();
// const surrealDb = new SurrealDatabase();

const allResources = Object.values(Item);

function init() {
  const cacheSource = new CacheManager();
  cacheSource.initialize();
  const db = new SurrealDatabase();
  const { subscribe, set, update } = writable<DataManager>({ cacheSource, db });
  return {
    subscribe,
    set,
    update,
    refreshStaleData,
    performMutation,
    // search: async (storeId: string, query: string) => {
    //   const store = cacheableStoresTable.find((x) => get(x).id === storeId);
    //   if (store) {
    //     return store?.search?.(query);
    //   }
    // },
    refresh: async (storeId: string) => {
      const store = cacheableStoresTable.find((x) => get(x).id === storeId);
      if (store) {
        refreshStores([store], false);
      }
    },
    refreshOnAppear: async () => {
      const storesThatNeedRefresh = cacheableStoresTable.filter(
        (x) => (get(x) as CacheableStore).priorityRefreshOnAppAppear
      );
      if (!isValidArrayWithData(storesThatNeedRefresh)) return;
      refreshStores(storesThatNeedRefresh);
      //TODO - fetch serverMutationMap along with response for priority store data and run refreshStaleData
    },
    cache: (store: CacheableStore) => {
      let strategy = store.cacheStrategy;
      const dm = get(dataManager);
      const cacheSource = dm.cacheSource;
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
      const dm = get(dataManager);
      const cacheSource = dm.cacheSource;
      let seedMutationMap: any = {};
      allResources.forEach((item) => {
        seedMutationMap[item] = 1;
      });
      const result = await cacheSource.mergeClientMutationMap(seedMutationMap);
      logger.log({ context: "dataManager.initialize", result });
      let serverSeed: any = {};
      allResources.forEach((item) => {
        serverSeed[item] = +(new Date().getTime() / 1000).toFixed();
      });
      await dm.db.query(`return fn::global::mergeMutationMap($map);`, {
        map: serverSeed
      });
      refreshStaleData();
    },
    syncPendingMutations: async () => {
      const dm = get(dataManager);
      const cacheSource = dm.cacheSource;
      const mutationQueue = cacheSource.dixie.mutationQueue;
      const mutations = await mutationQueue.toArray();
      let masterQuery = "";
      if (mutations.length > 0) {
        mutations.forEach((x) => {
          masterQuery += replaceParams(x.query, x.params) + ";";
        });
        const response = await dm.db.query(masterQuery);
        const result = interceptSurrealResponse(response);
        if (result) {
          await mutationQueue.clear();
          return;
        }
      }
    }
  };
}

/**
 * Performs a mutation on the server and propagates changes to the dependant stores according to the sync type.
 * @param storeId Id of the store to perform the mutation on.
 * @param data data to be passed to the server.
 * @param action type of mutation to be performed.
 * @param query Mutation query to be performed.
 * @returns result of the mutation.
 */
async function performMutation(
  storeId: string,
  data: any,
  action: PersistanceActionType,
  query?: string
) {
  logger.log({
    context: "dataManager.performMutation",
    storeId,
    query: action,
    data
  });
  const store = cacheableStoresTable.find((x) => get(x).id === storeId);
  const surrealDb = get(dataManager).db;
  if (!store) return;
  const storeData = get(store);
  console.log({ storeData });
  let defferedStores: CacheableStoreContract[] = [];
  storeData.mutatingResources.forEach((resource: string) => {
    const dependantStores = resolveDependantStores(resource);
    console.log({ dependantStores });
    dependantStores.forEach((x) => {
      const y = get(x);
      if (!y.dependencies) return;
      const syncType = y.dependencies.find(
        (k: ResourceDependency) => k.resource === resource
      )?.syncType;
      if (syncType === DependencySyncType.EAGER) {
        console.log("Eagerly refreshing", y.id);
        setRefreshingState([x], true);
        x.propagateDependencyChanges?.(data);
        setTimeout(() => {
          setRefreshingState([x], false);
        }, 1000);
      } else {
        defferedStores.push(x);
      }
    });
  });
  console.log({ defferedStores });
  const refreshQueryForDeferrredStores =
    resolveStoresRefreshQuery(defferedStores);
  let dbQuery: string = "";
  if (action === PersistanceActionType.CUSTOM_QUERY && query) dbQuery = query;
  else dbQuery = mutationQuery(action, data?.id);
  if (refreshQueryForDeferrredStores) {
    dbQuery = `${dbQuery};${refreshQueryForDeferrredStores}`;
  }
  logger.log({ context: "mutation query:", dbQuery });
  let response = await surrealDb.query(
    dbQuery,
    action === PersistanceActionType.CUSTOM_QUERY ? { ...data } : { data }
  );
  console.log("performMutation response", { response });
  if (!isValidArrayWithData(response)) return;
  setRefreshingState(defferedStores, true);
  response = response.map((x: any) => checkSurrealResponse(x));
  const mutationResponse = response[0];
  let deferredStoresResponse = response.slice(1);
  if (deferredStoresResponse[0]?.[0]?.id?.includes("mutationMap")) {
    deferredStoresResponse = deferredStoresResponse.slice(1);
  }
  for (let i = 0; i < defferedStores.length; i++) {
    const store = defferedStores[i];
    const data = deferredStoresResponse[i];
    if (store.loader && data) {
      store.loader(data);
    }
  }
  setTimeout(() => {
    setRefreshingState(defferedStores, false);
  }, 1000);
  //TODO - if required - fetch serverMutationMap along with response of mutation and run refreshStaleData
  if (mutationResponse) return mutationResponse;
  const cacheSource = get(dataManager).cacheSource;
  cacheSource.dixie.mutationQueue.add({
    timestamp: new Date().getTime(),
    query: action,
    params: { data }
  });
}

/**
 * Fetches the mutation map from the server.
 * @returns the mutation map.
 */
async function fetchServerMutationMap() {
  const surrealDb = get(dataManager).db;
  const appName = get(appStore).product;
  let serverMutationMap: any = {};
  const response = await surrealDb.executeReadFn(
    "return fn::global::fetchMutationMap();",
    {
      app: appName
    }
  );
  const result = interceptSurrealResponse(response);
  if (result?.forObjects) {
    result.forObjects.forEach((element: any) => {
      serverMutationMap[element.id] = element.modifiedAt;
    });
  }
  if (result?.forRecords) {
    serverMutationMap = { ...result.forRecords, ...serverMutationMap };
  }
  return serverMutationMap;
}

/**
 * Resolves the dependant stores for a given resource.
 * @param resource the resource to resolve the dependant stores for.
 * @returns a list of dependant stores.
 */
function resolveDependantStores(resource: string) {
  return cacheableStoresTable.filter((x) => {
    let store = get(x);
    if (!store.dependencies) {
      return (
        (store.dataType === StoreDataType.FIR && resource === store.id) ||
        (store.dataType === StoreDataType.KVO &&
          store.id.split(":")[1] === resource)
      );
    } else
      return store.dependencies.some(
        (y: ResourceDependency) => y.resource === resource
      );
  });
}

/**
 * Performs a refresh of the data stores that are out of sync with the server comparing the client and server mutation maps.
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
  refreshStores(storesThatNeedRefresh);
  cacheSource.mergeClientMutationMap(clientMutationMap, serverMutationMap);

  /**
   * Resolves the stores that need to be refreshed.
   * @returns a list of stores that need to be refreshed.
   */
  async function resolveStoresThatNeedRefresh(
    clientMutationMap: any,
    serverMutationMap: any
  ) {
    let storesThatNeedRefresh: CacheableStoreContract[] = [];
    allResources.forEach((resource) => {
      const clientVersion = clientMutationMap[resource];
      const serverVersion = serverMutationMap[resource];
      if (clientVersion && serverVersion) {
        if (clientVersion < serverVersion) {
          console.log(
            `${resource} dependant stores needs refresh - ${clientVersion} < ${serverVersion}`
          );
          const stores = resolveDependantStores(resource);
          storesThatNeedRefresh.push(...stores);
        }
      }
    });
    return storesThatNeedRefresh;
  }
}

/**
 * Refreshes the stores that need to be refreshed by bulk querying the server.
 * @param storesThatNeedRefresh the stores that need to be refreshed.
 */
async function refreshStores(
  storesThatNeedRefresh: CacheableStoreContract[],
  isShowRefreshingState: boolean = true
) {
  try {
    const surrealDb = get(dataManager).db;
    if (!isValidArrayWithData(storesThatNeedRefresh)) return;
    if (isShowRefreshingState)
      await setRefreshingState(storesThatNeedRefresh, true);
    const query = resolveStoresRefreshQuery(storesThatNeedRefresh);
    let response = await surrealDb.executeReadFn(query);
    if (!isValidArrayWithData(response)) return;
    response = response.map((x: any) => checkSurrealResponse(x));
    for (let i = 0; i < storesThatNeedRefresh.length; i++) {
      const store = storesThatNeedRefresh[i];
      const data = response[i];
      console.log({ store, data });
      if (store.loader && data) {
        store.loader(data);
      }
    }
  } catch (error) {
    logger.logError({ context: "Error refreshing stores", error });
  } finally {
    await setRefreshingState(storesThatNeedRefresh, false);
  }
}

/**
 * Sets the refreshing state for the stores.
 * @param stores Stores to set the refreshing state for.
 * @param val value to set the refreshing state to. true if refreshing, false otherwise.
 */
async function setRefreshingState(
  stores: CacheableStoreContract[],
  val: boolean
) {
  stores.forEach((store) => {
    store.update((x) => {
      console.log("setting refreshing state", x.id, val);
      x.isRefreshing = val;
      return x;
    });
  });
}

/**
 * Resolves the refresh query for the stores that need to be refreshed.
 * @param stores the stores that need to be refreshed.
 * @returns the refresh query.
 */
function resolveStoresRefreshQuery(stores: CacheableStoreContract[]) {
  return stores
    .map((x) => {
      const store = get(x) as CacheableStore;
      if (store?.refreshQuery) return store.refreshQuery;
      else return resolveRefreshQuery(store.id, store.dataType);
    })
    .join(";");
}
