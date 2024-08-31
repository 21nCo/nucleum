import { get, writable } from "svelte/store";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import {
  CacheStrategy,
  StoreDataType,
  type IStore,
  type DataManager,
  type ResourceDependency,
  DependencySyncType,
  PersistanceActionType,
  type IMutationParams,
  type IObservableStore
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
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { CacheManager } from "./cache";
import type { Table } from "dexie";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import { performApiCall } from "../utils/network.utils";
import { logger } from "../components/debug/logger.client";
import { LogType } from "../components/debug/debug.type";
import { ClientStorageKey } from "./persistence.type";
import { clientStorage } from "./persistence.utils";

export type DataMangerStore = ReturnType<typeof init>;
const allResources = Object.values(Resource);

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
    performMutation,
    refreshOnAppear,
    /**
     * TODO - use item param to determine the store to refresh instead of relying on cacheableStoresTable - since IFR stores like nodes, curations are refactored to use ResourcePersistance classes and inheritance instead and there is no need to maintain IFR stores except for customRefreshQuery and refresh
     * @param item
     * @returns
     */
    refreshForIFR: async (
      item: Resource,
      params?: { isFetchAll?: boolean }
    ) => {
      const dm = get(dataManager);
      const store = dm.cacheableStoresTable.find((x) => x.id === item);
      if (!store) return;
      const query = await resolveRefreshQueryForIFR(store, params?.isFetchAll);
      if (!query) return;
      const response = await db.query(query);
      const result = interceptSurrealResponse(response);
      if (!result) return;
      mergeIFRRecords(item, result);
    },
    runDboUpdate,
    performMutationForIFR: (
      item: Resource,
      data: any,
      params: IMutationParams
    ) => {
      logger.log(
        {
          context: "performing mutation for IFR",
          item,
          data,
          params
        },
        LogType.INFO
      );
      let localPersistancePromise;
      let bulkUpdatePromise: any[] = [];
      if (params.cacheStrategy === CacheStrategy.NO_CACHE) {
        return performMutation(item, data, params);
      }
      const dexie = get(dataManager).cacheSource.dexie;
      // @ts-ignore
      const table: Table = dexie[item];
      if (params.action === PersistanceActionType.DELETE) {
        table.delete(data.id);
      } else if (
        params.action === PersistanceActionType.CREATE ||
        params.action === PersistanceActionType.INSERT
      ) {
        if (params.query) {
          if ("resources" in data) table.bulkAdd(data.resources);
          else if ("resource" in data) table.add(data.resource);
        } else if (params.action === PersistanceActionType.INSERT) {
          localPersistancePromise = table.bulkAdd(data);
        } else {
          localPersistancePromise = table.add(data);
        }
      } else if (params.action === PersistanceActionType.REPLACE) {
        localPersistancePromise = table.put(data);
      } else if (params.action === PersistanceActionType.MERGE) {
        localPersistancePromise = table.update(data.id, data);
      } else if (params.action === PersistanceActionType.BULK_MERGE) {
        // localPersistancePromise = table.bulkUpdate(data.id, data);
        if (data.ids && data.ids.length > 0) {
          data.ids.forEach((id: string) => {
            bulkUpdatePromise.push(table.update(id, data));
          });
        }
      }
      return Promise.all([
        localPersistancePromise,
        ...bulkUpdatePromise,
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
        return refreshStores([store], { isShowRefreshingState });
      }
    },
    refreshPage: async (
      storeIdentifiers: string[],
      isShowRefreshingState: boolean = false
    ) => {
      const dm = get(dataManager);
      storeIdentifiers = [...storeIdentifiers];
      const stores = dm.cacheableStoresTable.filter((x) =>
        storeIdentifiers.includes(x.id)
      );
      if (isValidArrayWithData(stores)) {
        refreshStores(stores, { isPageRefresh: true, isShowRefreshingState });
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
      if (
        strategy === CacheStrategy.MERGE_RECORDS ||
        strategy === CacheStrategy.NO_CACHE
      )
        return;
      cacheSource.cacheKvStore(store.id, store.get());
    },
    retrieveCache: async (storeId: string) => {
      const cacheSource = get(dataManager).cacheSource;
      return await cacheSource.retrieveKvCache(storeId);
    },
    initialize: async (stores: IStore[]) => {
      const cacheSource = new CacheManager();
      await cacheSource.initialize();
      update((x) => {
        x.cacheSource = cacheSource;
        x.cacheableStoresTable = stores;
        return x;
      });
    },
    /**
     * This method will be called on signup and database is bootstrapped.
     * This will persist all kv seed data on cloud.
     */
    bootstrap: async () => {
      await runDboUpdate();
      const dm = get(dataManager);
      let data = dm.cacheableStoresTable
        .filter((x) => x.dataType === StoreDataType.KVO)
        .map((x) => {
          const k = x as IObservableStore<any>;
          return { id: k.id, ...k.seed };
        });
      data = [...data, { id: "mutationMap" }];
      const query = `INSERT INTO kv $data;`;
      const response = await dm.db.query(query, { data });
      return response;
    },
    /**
     * Refreshes and updates the client side cached data with the latest data from the server.
     */
    refreshClientCache: async () => {
      logger.log({ at: "dataManager.refreshClientCache" });
      const dm = get(dataManager);
      const cacheSource = dm.cacheSource;
      //await setSeedMutationMap();
      // await refreshStaleData();
      await refreshOnAppear();

      async function setSeedMutationMap() {
        let seedMutationMap: any = {};
        allResources.forEach((item) => {
          seedMutationMap[item] = 1;
        });
        const result =
          await cacheSource.mergeClientMutationMap(seedMutationMap);
        logger.log({ context: "dataManager.refreshApp", result });
        let serverSeed: any = {};
        allResources.forEach((item) => {
          serverSeed[item] = +(new Date().getTime() / 1000).toFixed();
        });
        await dm.db.query(`return fn::global::mergeMutationMap($map);`, {
          map: serverSeed
        });
      }
    },
    syncPendingMutations: async () => {
      const dm = get(dataManager);
      const cacheSource = dm.cacheSource;
      const mutationQueue = cacheSource.dexie.mutationQueuev2;
      const mutations = await mutationQueue
        .where("retryCount")
        .between(0, 3)
        .and((x) => x.isInProgress === false)
        .toArray();
      if (mutations.length < 1) {
        return;
      }
      let masterQuery = "";
      let mutatingResources: string[] = [];
      mutations.forEach((x) => {
        masterQuery += replaceParams(x.query, x.params) + ";";
        mutatingResources = [
          ...mutatingResources,
          ...(x.mutatingResources ?? [])
        ];
      });
      if (!masterQuery) {
        logger.log("No valid mutations to sync");
        return;
      }
      logger.log(
        {
          context: "syncPendingMutations",
          mutations: mutations.map((x) => x.id)
        },
        LogType.INFO
      );
      mutationQueue.bulkPut(
        mutations.map((x) => ({ ...x, isInProgress: true }))
      );
      mutationQueue.bulkPut(
        mutations.map((x) => ({ ...x, isInProgress: true }))
      );
      let response = await dm.db.query(masterQuery, {});
      logger.log(
        {
          context: "syncPendingMutations - response",
          response
        },
        LogType.INFO
      );
      if (!response) {
        for (let i = 0; i < mutations.length; i++) {
          await mutationQueue.update(mutations[i].id, {
            retryCount: (mutations[i]?.retryCount ?? 0) + 1,
            isInProgress: false
          });
        }
        return;
      }
      response = response.map((x: any) => checkSurrealResponse(x));
      for (let i = 0; i < response.length; i++) {
        if (response[i] && mutations[i]) {
          await mutationQueue.delete(mutations[i].id);
        } else if (mutations[i]) {
          await mutationQueue.update(mutations[i].id, {
            retryCount: (mutations[i]?.retryCount ?? 0) + 1,
            isInProgress: false
          });
        }
      }
      let storesToRefresh: IStore[] = [];
      const uniqueMutatingResources = [...new Set(mutatingResources)];
      uniqueMutatingResources.forEach((resource) => {
        storesToRefresh = [
          ...storesToRefresh,
          ...resolveDependantStores(resource, true)
        ];
      });
      await refreshStores(storesToRefresh);
    }
  };
}
export const dataManager = init();

/**
 * Runs the dbo update for the app resolving dbo dependencies from all registered stores.
 * @returns
 */
async function runDboUpdate() {
  logger.log({ at: "runDboUpdate" });
  const dm = get(dataManager);
  const dependencies = dm.cacheableStoresTable
    .map((x) => x.dboDependencies)
    .filter((x) => x)
    .flat();
  try {
    const response = await performApiCall("account/n/updateDb", "POST", {
      dbo: dependencies
    });
    if (!response?.ok) {
      return;
    }
    const data = await response.json();
    return data;
  } catch (err) {
    logger.error(err);
  }
}

async function refreshOnAppear() {
  const dm = get(dataManager);
  const storesThatNeedRefresh = dm.cacheableStoresTable.filter(
    (x) => (x as IStore).refreshOnAppear
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
async function addToMutationQueue(
  id: string,
  params: {
    query: string;
    params: any;
    mutatingResources: string[];
  }
) {
  const cacheSource = get(dataManager).cacheSource;
  cacheSource.dexie.mutationQueuev2.put({
    id,
    timestamp: new Date().getTime(),
    query: params.query,
    params: params.params,
    mutatingResources: params.mutatingResources,
    retryCount: 0,
    isInProgress: false
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
  const { resources, isKVStore } = resolveMutatingResources(mutatedAt);
  const mutationQuery = resolveMutationQuery2();
  const mutationParams =
    params.query || params.action === PersistanceActionType.BULK_MERGE
      ? { ...data, mutatedAt }
      : { data, mutatedAt };
  const mutationId = params.queueParams?.mutationId ?? generateUID();
  if (params.queueParams?.isUseQueueFirstApproach) {
    addToMutationQueue(mutationId, {
      query: mutationQuery,
      params: mutationParams,
      mutatingResources: resources
    });
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
    addToMutationQueue(mutationId, {
      query: mutationQuery,
      params: mutationParams,
      mutatingResources: resources
    });
    return;
  }
  response = response.map((x: any) => checkSurrealResponse(x));
  const mutationResponse = response[0];
  propagateToDefferedStores(defferedStores, response);
  //TODO - if required - fetch serverMutationMap along with response of mutation and run refreshStaleData
  if (mutationResponse) return mutationResponse;
  addToMutationQueue(mutationId, {
    query: mutationQuery,
    params: mutationParams,
    mutatingResources: resources
  });

  function resolveMutationQuery2() {
    if (params.query) return params.query;
    else {
      let id = data?.id;
      if (isKVStore && !storeId.includes("kv:")) {
        id = "kv:" + storeId;
        data.id = id;
      }
      if (
        params.action === PersistanceActionType.INSERT ||
        params.action === PersistanceActionType.BULK_MERGE
      ) {
        id = storeId;
      }
      logger.log({ id, storeId, isKVStore });
      return resolveMutationQuery(params.action, id, {
        userId: data.modifiedBy ? data.modifiedBy : "",
        isPreventMutationMapEntry: params.queueParams?.isUseQueueFirstApproach
      });
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
      logger.log({
        storeId,
        stores: dm.cacheableStoresTable
      });
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
  const appName = clientStorage.get(ClientStorageKey.PRODUCT);
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
function resolveDependantStores(
  resource: string,
  isExcludeSelf: boolean = false
) {
  const dm = get(dataManager);
  return dm.cacheableStoresTable.filter((store) => {
    if (!store) return false;
    if (!store.dependencies && !isExcludeSelf) {
      return (
        ((store.dataType === StoreDataType.FIR ||
          store.dataType === StoreDataType.IFR) &&
          resource === store.id) ||
        (store.dataType === StoreDataType.KVO &&
          store.id?.split(":")[1] === resource)
      );
    } else if (store.dependencies)
      return store.dependencies.some(
        (y: ResourceDependency) => y.resource === resource
      );
    else return false;
  });
}

/**
 * @deprecated - using isRefreshOnAppear flag on stores instead
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
  params: { isShowRefreshingState?: boolean; isPageRefresh?: boolean } = {
    isShowRefreshingState: true,
    isPageRefresh: false
  }
) {
  try {
    const dm = get(dataManager);
    const surrealDb = dm.db;
    if (!isValidArrayWithData(storesThatNeedRefresh)) return;
    if (params.isShowRefreshingState)
      await setRefreshingState(storesThatNeedRefresh, true);
    if (params.isPageRefresh)
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
    logger.error({ at: "Error refreshing stores", error });
  } finally {
    await setRefreshingState(storesThatNeedRefresh, false);
    if (params.isPageRefresh)
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
      if (x) x.isRefreshing = val;
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
async function resolveRefreshQueryForIFR(
  storeData: IStore,
  isFetchAll: boolean = false
) {
  let customQuery: string | undefined = storeData.refreshQuery;
  let query: string | undefined = undefined;
  let since;
  if (!isFetchAll) {
    let dm = get(dataManager);
    // @ts-ignore
    const table = dm.cacheSource.dexie[storeData.id];
    if (!table) return;
    const latestRecord = await table.orderBy("modifiedAt").last();
    since =
      latestRecord?.modifiedAt ??
      new Date(new Date().getTime() - 20 * 365 * 24 * 60 * 60 * 1000);
  }
  if (!customQuery) {
    query = resolveRefreshQuery(storeData.id, StoreDataType.IFR, {
      isFetchAll
    });
  } else query = customQuery;
  if (query) query = replaceParams(query, { since });
  return query;
}

async function mergeIFRRecords(
  item: Resource,
  response: { records: any[]; totalCount: number }
) {
  let dm = get(dataManager);
  const dexie = dm.cacheSource.dexie;
  // @ts-ignore
  const table: Table = dexie[item];
  if (!table) return;
  if (isValidArrayWithData(response.records))
    await table.bulkPut(response.records);
  const totalCacheCount = await table.count();
  logger.log({ totalCacheCount, totalServerCount: response.totalCount });
  if (totalCacheCount < response.totalCount) {
    await dataManager.refreshForIFR(item, { isFetchAll: true });
  }
}
