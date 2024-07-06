import { get, writable } from "svelte/store";
import { Item } from "../types/item.enum";
import {
  CacheStrategy,
  StoreDataType,
  type IStore,
  type DataManager,
  type ResourceDependency,
  DependencySyncType,
  PersistanceActionType,
  type IMutationParams
} from "../types/data.type";
import {
  surrealUnixTimestamp,
  replaceParams,
  resolveMutationQuery,
  resolveRefreshQuery
} from "$lib/client/utils/surreal.utils";
import {
  checkSurrealResponse,
  generateUID,
  interceptSurrealResponse
} from "$lib/client/utils/utils";
import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
import { CacheManager } from "./cache";
import { logger } from "$lib/client/stores/log.store";
import { prefixTable } from "$lib/client/utils/text.utils";
import type { Table } from "dexie";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";

// const surrealDb = new SurrealDatabase();
export type DataMangerStore = ReturnType<typeof init>;
const allResources = Object.values(Item);

function init() {
  const cacheSource = new CacheManager();
  cacheSource.initialize();
  const db = new SurrealDatabase();
  const { subscribe, set, update } = writable<DataManager>({
    cacheSource,
    db,
    cacheableStoresTable: []
  });
  return {
    subscribe,
    set,
    update,
    refreshStaleData,
    performMutation,
    refreshOnAppear,
    /**
     * TODO - use item param to determine the store to refresh instead of relying on cacheableStoresTable - since IFR stores like nodes, curations are refactored to use ResourcePersistance classes and inheritance instead and there is no need to maintain IFR stores except for customRefreshQuery and refresh
     * @param item
     * @returns
     */
    refreshForIFR: async (item: Item) => {
      const dm = get(dataManager);
      const store = dm.cacheableStoresTable.find((x) => x.id === item);
      if (!store) return;
      const query = await resolveRefreshQueryForIFR(store);
      if (!query) return;
      const response = await db.query(query);
      const result = interceptSurrealResponse(response);
      if (isValidArrayWithData(result)) {
        mergeIFRRecords(item, result);
      }
    },
    performMutationForIFR: (item: Item, data: any, params: IMutationParams) => {
      let localPersistancePromise;
      const dexie = get(dataManager).cacheSource.dexie;
      data = {
        id: prefixTable(generateUID(), item),
        modifiedAt: new Date().toISOString(),
        ...data
      };
      // @ts-ignore
      const table: Table = dexie[item];
      if (params.action === PersistanceActionType.DELETE) {
        // table.delete(data.id);
        localPersistancePromise = table.update(data.id, {
          trashInformation: {
            deletedAt: new Date().toISOString(),
            deletedBy: data.modifiedBy
          },
          modifiedBy: data.modifiedBy,
          modifiedAt: new Date().toISOString()
        });
      } else if (
        params.action === PersistanceActionType.CREATE ||
        params.action === PersistanceActionType.CUSTOM_CREATE
      ) {
        if (!("resources" in data)) localPersistancePromise = table.add(data);
        else table.bulkAdd(data.resources);
        if (params.action === PersistanceActionType.CUSTOM_CREATE)
          params.action = PersistanceActionType.CUSTOM_QUERY;
      } else if (params.action === PersistanceActionType.UPDATE) {
        localPersistancePromise = table.put(data);
      } else if (params.action === PersistanceActionType.MERGE) {
        localPersistancePromise = table.update(data.id, data);
      }
      return Promise.all([
        localPersistancePromise,
        performMutation(item, data, params)
      ]);
    },
    search: async (storeId: string, query: string) => {
      const dm = get(dataManager);
      const store = dm.cacheableStoresTable.find((x) => x.id === storeId);
      if (store) {
        return store?.search?.(query);
      }
    },
    refresh: async (
      storeId: string,
      isShowRefreshingState: boolean = false
    ) => {
      const dm = get(dataManager);
      const store = dm.cacheableStoresTable.find((x) => x.id === storeId);
      if (store) {
        return refreshStores([store], isShowRefreshingState);
      }
    },
    refreshPage: async (storeIdentifiers: string[]) => {
      const dm = get(dataManager);
      const stores = dm.cacheableStoresTable.filter((x) =>
        storeIdentifiers.includes(x.id)
      );
      if (isValidArrayWithData(stores)) {
        refreshStores(stores, false, true);
      }
    },
    cache: (store: IStore) => {
      let strategy = store.cacheStrategy;
      const dm = get(dataManager);
      const cacheSource = dm.cacheSource;
      if (!strategy) {
        if (
          store.dataType === StoreDataType.KVO ||
          store.dataType === StoreDataType.NA ||
          store.dataType === StoreDataType.FIR ||
          store.id.startsWith("kv:")
        ) {
          strategy = CacheStrategy.WHOLE;
        } else {
          strategy = CacheStrategy.MERGE_RECORDS;
        }
      }
      cacheSource.cacheStore(store.id, store.get(), strategy);
    },
    retrieveCache: async (storeId: string) => {
      const cacheSource = get(dataManager).cacheSource;
      return await cacheSource.retrieveCache(storeId);
    },
    initialize: async (stores: IStore[], isLiteMode: boolean = false) => {
      update((x) => {
        x.cacheSource = new CacheManager();
        x.cacheableStoresTable = stores;
        return x;
      });
      if (isLiteMode) return;
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
      const mutationQueue = cacheSource.dexie.mutationQueuev2;
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
export const dataManager = init();
async function refreshOnAppear() {
  const dm = get(dataManager);
  const storesThatNeedRefresh = dm.cacheableStoresTable.filter(
    (x) => (x as IStore).priorityRefreshOnAppAppear
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
async function addToMutationQueue(id: string, query: string, params: any) {
  const cacheSource = get(dataManager).cacheSource;
  cacheSource.dexie.mutationQueuev2.put({
    id,
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
  params: IMutationParams
) {
  const dm = get(dataManager);
  const mutatedAt = surrealUnixTimestamp();
  data = { ...data, mutatedAt };
  const { resources, isKVStore } = resolveMutatingResources(mutatedAt);
  const mutationQuery = resolveMutationQuery2();
  const mutationParams =
    params.action === PersistanceActionType.CUSTOM_QUERY
      ? { ...data }
      : { data };
  const mutationId = params.queueParams?.mutationId ?? generateUID();
  if (params.queueParams?.isUseQueueFirstApproach) {
    addToMutationQueue(mutationId, mutationQuery, mutationParams);
    return;
  }
  const defferedStores = propagateToEagerStores(resources, data);
  const refreshQueryForDeferredStores =
    await resolveStoresRefreshQuery(defferedStores);

  let dbFullQuery: string = `${mutationQuery};`;
  if (refreshQueryForDeferredStores) {
    dbFullQuery += `${refreshQueryForDeferredStores}`;
  }
  logger.log({ context: "mutation full query:", dbFullQuery });
  const surrealDb = dm.db;
  let response = await surrealDb.query(dbFullQuery, mutationParams);
  if (!isValidArrayWithData(response)) {
    addToMutationQueue(mutationId, mutationQuery, mutationParams);
    return;
  }
  response = response.map((x: any) => checkSurrealResponse(x));
  const mutationResponse = response[0];
  propagateToDefferedStores(defferedStores, response);
  //TODO - if required - fetch serverMutationMap along with response of mutation and run refreshStaleData
  if (mutationResponse) return mutationResponse;
  addToMutationQueue(mutationId, mutationQuery, mutationParams);

  function resolveMutationQuery2() {
    if (params.action === PersistanceActionType.CUSTOM_QUERY && params.query)
      return params.query;
    else {
      let id = data?.id;
      if (isKVStore && !storeId.includes("kv:")) {
        id = "kv:" + storeId;
        data.id = id;
      }
      return resolveMutationQuery(
        params.action,
        id,
        data.modifiedBy ? data.modifiedBy : ""
      );
    }
  }

  /**
   * Resolves the resources that are being mutated and updates the mutation map. These resources are used to determine the dependant stores.
   * @returns the resources that are being mutated.
   */
  function resolveMutatingResources(
    mutatedAt: number = +(new Date().getTime() / 1000).toFixed()
  ) {
    if (params.isMutatingSelfOnly) {
      dm.cacheSource.mergeClientMutationMap({ [storeId]: mutatedAt });
      return { resources: [storeId], isKVStore: false };
    } else {
      // console.log({
      //   storeId,
      //   stores: dm.cacheableStoresTable.map((x) => get(x).id)
      // });
      const store = dm.cacheableStoresTable.find((x) => x.id === storeId);
      if (!store) return { resources: [], isKVStore: false };
      const isKVStore = store.dataType === StoreDataType.KVO;
      const mutatingResources = store.mutatingResources;
      if (mutatingResources) return { resources: mutatingResources, isKVStore };
      return {
        resources: [storeId],
        isKVStore
      };
    }
  }

  /**
   * Propagates the changes to the dependant stores with eager sync type and returns the deffered stores.
   * @param mutatingResources the resources that are being mutated.
   * @param data the data to be propagated.
   * @returns the deffered stores.
   */
  function propagateToEagerStores(mutatingResources: string[], data: any) {
    let defferedStores: IStore[] = [];
    if (!mutatingResources) return defferedStores;
    mutatingResources.forEach((resource: string) => {
      const dependantStores = resolveDependantStores(resource);
      dependantStores.forEach((x) => {
        if (!x.dependencies) return;
        const syncType = x.dependencies.find(
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
  function propagateToDefferedStores(defferedStores: IStore[], response: any) {
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
  const appName = localStorage.getItem("product");
  if (!appName) return;
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
  const dm = get(dataManager);
  return dm.cacheableStoresTable.filter((store) => {
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
    let storesThatNeedRefresh: IStore[] = [];
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
  storesThatNeedRefresh: IStore[],
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

      const data = response[i];
      if (store.loader && data) {
        store.loader(data);
      } else if (store.dataType === StoreDataType.IFR && data) {
        mergeIFRRecords(store.id, data);
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
  stores: (IStore & { update?: any })[],
  val: boolean
) {
  stores.forEach((store) => {
    if (!store.update) return;
    store.update?.((x) => {
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
  stores: (IStore & { update?: any })[],
  val: boolean
) {
  stores.forEach((store) => {
    if (!store.update) return;
    store.update?.((x) => {
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
async function resolveStoresRefreshQuery(stores: IStore[]) {
  const queries = await Promise.all(
    stores.map(async (store) => {
      if (store?.dataType === StoreDataType.IFR)
        return resolveRefreshQueryForIFR(store);
      else if (store?.refreshQuery) return store.refreshQuery;
      else if (store.resolveRefreshQuery) return store.resolveRefreshQuery();
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
async function resolveRefreshQueryForIFR(storeData: IStore) {
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

async function mergeIFRRecords(item: Item, records: any[]) {
  let dm = get(dataManager);
  const dexie = dm.cacheSource.dexie;
  // @ts-ignore
  const table = dexie[item];
  if (!table) return;
  records.forEach((record) => {
    table.put(record);
  });
}
