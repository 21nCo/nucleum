import { SurrealDatabase } from "$lib/client/access/surrealHelper";
import account from "$lib/client/stores/account.store";
import { appStore, cacheableStoresTable } from "$lib/client/stores/app.store";
import { get, writable } from "svelte/store";
import { Item, type ItemType } from "../types/item.enum";
import {
  checkSurrealResponse,
  generateUID,
  interceptSurrealResponse
} from "$lib/client/utils/utils";
import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
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
  surrealUnixTimestamp,
  replaceParams,
  resolveMutationQuery,
  resolveRefreshQuery
} from "$lib/client/utils/surreal.utils";
import { CacheManager } from "./cache";
import { logger } from "$lib/client/stores/log.store";
import { prefixTable } from "$lib/client/utils/text.utils";
import type { Table } from "dexie";
export const dataManager = init();
// const surrealDb = new SurrealDatabase();
export type DataMangerStore = ReturnType<typeof init>;
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
    refreshOnAppear,
    refreshForIFR: async (item: ItemType) => {
      const store = cacheableStoresTable.find((x) => get(x).id === item);
      if (!store) return;
      const query = await resolveRefreshQueryForIFR(get(store));
      if (!query) return;
      const response = await db.query(query);
      const result = interceptSurrealResponse(response);
      if (isValidArrayWithData(result)) {
        mergeIFRRecords(item, result);
      }
    },
    performMutationForIFR: (
      item: ItemType,
      action: PersistanceActionType,
      data: any,
      query?: string
    ) => {
      let localPersistancePromise;
      const dexie = get(dataManager).cacheSource.dexie;
      data = { id: prefixTable(generateUID(), item), ...data };
      // @ts-ignore
      const table: Table = dexie[item];
      if (action === PersistanceActionType.DELETE) {
        // table.delete(data.id);
        localPersistancePromise = table.update(data.id, {
          trashInformation: {
            deletedAt: new Date().toISOString(),
            deletedBy: get(account)?.userInfo?.id
          }
        });
      } else if (action === PersistanceActionType.CREATE) {
        localPersistancePromise = table.add(data);
      } else if (action === PersistanceActionType.UPDATE) {
        localPersistancePromise = table.put(data);
      } else if (action === PersistanceActionType.MERGE) {
        localPersistancePromise = table.update(data.id, data);
      }
      return Promise.all([
        localPersistancePromise,
        performMutation(item, data, action, query, true)
      ]);
    },
    search: async (storeId: string, query: string) => {
      const store = cacheableStoresTable.find((x) => get(x).id === storeId);
      if (store) {
        return store?.search?.(query);
      }
    },
    refresh: async (
      storeId: string,
      isShowRefreshingState: boolean = false
    ) => {
      const store = cacheableStoresTable.find((x) => get(x).id === storeId);
      if (store) {
        return refreshStores([store], isShowRefreshingState);
      }
    },
    refreshPage: async (storeIdentifiers: string[]) => {
      const stores = cacheableStoresTable.filter((x) =>
        storeIdentifiers.includes(get(x).id)
      );
      if (isValidArrayWithData(stores)) {
        refreshStores(stores, false, true);
      }
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
      await refreshStaleData();
      await refreshOnAppear();
    },
    syncPendingMutations: async () => {
      const dm = get(dataManager);
      const cacheSource = dm.cacheSource;
      const mutationQueue = cacheSource.dexie.mutationQueue;
      const mutations = await mutationQueue.toArray();
      let masterQuery = "";
      if (mutations.length > 0) {
        mutations.forEach((x) => {
          masterQuery += replaceParams(x.query, x.params) + ";";
        });
        const response = await dm.db.query(masterQuery, {});
        const result = interceptSurrealResponse(response);
        if (result) {
          await mutationQueue.clear();
          return;
        }
      }
    }
  };
}
async function refreshOnAppear() {
  const storesThatNeedRefresh = cacheableStoresTable.filter(
    (x) => (get(x) as CacheableStore).priorityRefreshOnAppAppear
  );
  if (!isValidArrayWithData(storesThatNeedRefresh)) return;
  return refreshStores(storesThatNeedRefresh);
  //TODO - fetch serverMutationMap along with response for priority store data and run refreshStaleData
}

/**
 * Adds a mutation to the mutation queue.
 * @param query db query to be added to the mutation queue
 * @param params db query params to be added to the mutation queue
 */
async function addToMutationQueue(query: string, params: any) {
  const cacheSource = get(dataManager).cacheSource;
  cacheSource.dexie.mutationQueue.add({
    timestamp: new Date().getTime(),
    query,
    params
  });
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
  query?: string,
  isMutatingSelfOnly: boolean = false
) {
  logger.log({
    context: "dataManager.performMutation",
    storeId,
    action,
    data
  });
  if (!get(account).isLoggedIn) return;
  const dm = get(dataManager);
  let mutatingResources: string[] = [];
  let isKVStore: boolean = false;
  if (isMutatingSelfOnly) {
    const mutatedAt = surrealUnixTimestamp();
    dm.cacheSource.mergeClientMutationMap({ [storeId]: mutatedAt });
    data = { ...data, mutatedAt };
    mutatingResources = [storeId];
  } else {
    const store = cacheableStoresTable.find((x) => get(x).id === storeId);
    if (!store) return;
    const storeData = get(store);
    mutatingResources = storeData.mutatingResources;
    if (storeData.dataType === StoreDataType.KVO) {
      isKVStore = true;
    }
    if (!mutatingResources) {
      mutatingResources = [storeId];
    }
  }
  const defferedStores = propagateToEagerStores(mutatingResources, data);
  const refreshQueryForDeferredStores =
    await resolveStoresRefreshQuery(defferedStores);
  let mutationQuery: string = "";
  if (action === PersistanceActionType.CUSTOM_QUERY && query)
    mutationQuery = query;
  else {
    let id = data?.id;
    if (isKVStore && !storeId.includes("kv:")) {
      id = "kv:" + storeId;
      data.id = id;
    }
    mutationQuery = resolveMutationQuery(
      action,
      id,
      get(account)?.userInfo?.id
    );
  }
  let dbFullQuery: string = `${mutationQuery};`;
  if (refreshQueryForDeferredStores) {
    dbFullQuery += `${refreshQueryForDeferredStores}`;
  }
  const mutationParams =
    action === PersistanceActionType.CUSTOM_QUERY ? { ...data } : { data };
  logger.log({ context: "mutation full query:", dbFullQuery });
  const surrealDb = dm.db;
  let response = await surrealDb.query(dbFullQuery, mutationParams);
  if (!isValidArrayWithData(response)) {
    addToMutationQueue(mutationQuery, mutationParams);
    return;
  }
  response = response.map((x: any) => checkSurrealResponse(x));
  const mutationResponse = response[0];
  propagateToDefferedStores(defferedStores, response);
  //TODO - if required - fetch serverMutationMap along with response of mutation and run refreshStaleData
  if (mutationResponse) return mutationResponse;
  addToMutationQueue(mutationQuery, mutationParams);

  /**
   * Propagates the changes to the dependant stores with eager sync type and returns the deffered stores.
   * @param mutatingResources the resources that are being mutated.
   * @param data the data to be propagated.
   * @returns the deffered stores.
   */
  function propagateToEagerStores(mutatingResources: string[], data: any) {
    let defferedStores: CacheableStoreContract[] = [];
    mutatingResources.forEach((resource: string) => {
      const dependantStores = resolveDependantStores(resource);
      dependantStores.forEach((x) => {
        const y = get(x);
        if (!y.dependencies) return;
        const syncType = y.dependencies.find(
          (k: ResourceDependency) => k.resource === resource
        )?.syncType;
        if (syncType === DependencySyncType.EAGER) {
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
    return defferedStores;
  }

  /**
   * Parses the response and propagates the store data for respective deffered stores.
   * @param defferedStores
   * @param response
   */
  function propagateToDefferedStores(
    defferedStores: CacheableStoreContract[],
    response: any
  ) {
    setRefreshingState(defferedStores, true);
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
  }
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
      serverMutationMap[element.id] =
        typeof element.modifiedAt === "number"
          ? element.modifiedAt
          : surrealUnixTimestamp(element.modifiedAt);
    });
  }
  if (result?.forRecords) {
    serverMutationMap = { ...result.forRecords, ...serverMutationMap };
  }
  return serverMutationMap;
}

/**
 * Resolves the dependant stores for a given resource.
 *
 * This is used to refresh the stores based on mutationMap (mutation happened on some other client - {@link refreshStaleData})
 *
 * or
 *
 * refresh after mutation in the current client ({@link performMutation} method).
 *
 *
 *
 * @param resource the resource to resolve the dependant stores for.
 * @returns a list of dependant stores.
 */
function resolveDependantStores(resource: string) {
  return cacheableStoresTable.filter((x) => {
    let store = get(x);
    if (!store) return false;
    if (!store.dependencies) {
      return (
        ((store.dataType === StoreDataType.FIR ||
          store.dataType === StoreDataType.IFR) &&
          resource === store.id) ||
        (store.dataType === StoreDataType.KVO &&
          store.id?.split(":")[1] === resource)
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
  if (!clientMutationMap || !serverMutationMap) return;
  const storesThatNeedRefresh = await resolveStoresThatNeedRefresh(
    clientMutationMap,
    serverMutationMap
  );
  if (!isValidArrayWithData(storesThatNeedRefresh)) {
    cacheSource.mergeClientMutationMap(serverMutationMap, clientMutationMap);
    return;
  }
  logger.log("Stale data found. Refreshing stores");
  await refreshStores(storesThatNeedRefresh);
  //TODO - merge only after successful refresh
  cacheSource.mergeClientMutationMap(serverMutationMap, clientMutationMap);

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
  isShowRefreshingState: boolean = true,
  isPageRefresh: boolean = false
) {
  try {
    const dm = get(dataManager);
    const surrealDb = dm.db;
    if (!isValidArrayWithData(storesThatNeedRefresh)) return;
    if (isShowRefreshingState)
      await setRefreshingState(storesThatNeedRefresh, true);
    if (isPageRefresh)
      await setPageRefreshingState(storesThatNeedRefresh, true);
    const query = await resolveStoresRefreshQuery(storesThatNeedRefresh);
    let response = await surrealDb.executeReadFn(query, {});
    if (!isValidArrayWithData(response)) return;
    response = response.map((x: any) => checkSurrealResponse(x));
    for (let i = 0; i < storesThatNeedRefresh.length; i++) {
      const store = storesThatNeedRefresh[i];
      const storeData = get(store);
      const data = response[i];
      if (store.loader && data) {
        store.loader(data);
      } else if (storeData.dataType === StoreDataType.IFR && data) {
        mergeIFRRecords(storeData.id, data);
      }
    }
  } catch (error) {
    logger.logError({ context: "Error refreshing stores", error });
  } finally {
    await setRefreshingState(storesThatNeedRefresh, false);
    if (isPageRefresh)
      await setPageRefreshingState(storesThatNeedRefresh, false);
    return true;
  }
}
/**
 * Sets the refreshing state for the page in child stores.
 * @param stores Stores to set the refreshing state for.
 * @param val value to set the refreshing state to. true if refreshing, false otherwise.
 */
async function setPageRefreshingState(
  stores: CacheableStoreContract[],
  val: boolean
) {
  stores.forEach((store) => {
    store.update((x) => {
      x.isPageRefreshing = val;
      return x;
    });
  });
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
async function resolveStoresRefreshQuery(stores: CacheableStoreContract[]) {
  const queries = await Promise.all(
    stores.map(async (x) => {
      const store = get(x) as CacheableStore;
      if (store?.dataType === StoreDataType.IFR)
        return resolveRefreshQueryForIFR(store);
      else if (store?.refreshQuery) return store.refreshQuery;
      else if (x.resolveRefreshQuery) return x.resolveRefreshQuery();
      else return resolveRefreshQuery(store.id, store.dataType);
    })
  );
  return queries.join(";");
}

/**
 * Resolves the refresh query for the IFR stores.
 * @param storeData
 * @returns
 */
async function resolveRefreshQueryForIFR(storeData: CacheableStore) {
  let customQuery: string | undefined = storeData.refreshQuery;
  let query: string | undefined = undefined;
  let dm = get(dataManager);
  // @ts-ignore
  const table = dm.cacheSource.dexie[storeData.id];
  if (!table) return;
  const latestRecord = await table.orderBy("modifiedAt").last();
  const since =
    latestRecord?.modifiedAt ??
    new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000);
  if (!customQuery) {
    query = resolveRefreshQuery(storeData.id, StoreDataType.IFR);
  } else query = customQuery;
  if (query) query = replaceParams(query, { since });
  return query;
}

async function mergeIFRRecords(item: ItemType, records: any[]) {
  let dm = get(dataManager);
  const dexie = dm.cacheSource.dexie;
  // @ts-ignore
  const table = dexie[item];
  if (!table) return;
  records.forEach((record) => {
    table.put(record);
  });
}
