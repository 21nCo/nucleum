import type { Writable } from "svelte/store";
import type { LocalDexie } from "$local/local";
import type { ISurrealDatabase } from "./db.type";

/**
 * The operations which can be performed on a cacheable store
 */
export interface CacheableStoreContract extends Writable<any> {
  loader?: (data: any) => void;
  search?: (query: string) => Promise<any>;
  resolveRefreshQuery?: () => string;
  propagateDependencyChanges?: (params: any) => void;
}

/**
 * The store which can be cached and retrieved
 */
export interface ICacheableStore {
  /**
   * The unique identifier of the store which is used to cache and retrieve the store. see dataManager
   */
  id: string;
  /**
   * The query to be used to refresh the store
   */
  refreshQuery?: string;
  /**
   * The type of data the store holds
   */
  dataType: StoreDataType;
  /**
   * The resources on which the store depends on
   */
  dependencies?: ResourceDependency[];
  /**
   * The resources which will be mutated by the store
   */
  mutatingResources?: string[];
  /**
   * The cache strategy to use for the store
   */
  cacheStrategy?: CacheStrategy;
  /**
   * Setting this true will refresh the store when the app appears before even performing stale check
   */
  priorityRefreshOnAppAppear?: boolean;
  /**
   * The state of the store when it is refreshing
   */
  isRefreshing?: boolean;
  /**
   * The state of the store the page which this particular store is part of is refreshing - will be set when dataManager.refreshPage is triggered
   */
  isPageRefreshing?: boolean;
  /**
   * When this is turned on, local storage is used to cache the store.
   */
  isSynchronousCache?: boolean;
}

/**
 * The type of data the store holds
 */
export enum StoreDataType {
  /**
   * Finite and infrequently mutated Records
   */
  FIR = "FIR",
  /**
   * Infinite and frequently mutated Records
   */
  IFR = "IFR",
  /**
   * Finite and Constant system Records
   */
  FCR = "FCR",
  /**
   * Key Value Object
   */
  KVO = "KVO",
  /**
   * Non persisting data
   */
  NON_PERSISTING = "NON_PERSISTING"
}

/**
 * The cache strategy to use for the store.
 */
export enum CacheStrategy {
  /**
   * The whole store is replaced
   */
  WHOLE = "WHOLE",
  /**
   * Only the records are replaced
   */
  MERGE_RECORDS = "MERGE_RECORDS"
}

/**
 * Data manager which is responsible for managing the cache and the stores in the application
 */
export interface DataManager {
  cacheSource: CacheSource;
  db: ISurrealDatabase;
  cacheableStoresTable: CacheableStoreContract[];
}

/**
 * The source of the cache which handles the caching and retrieval of the cache
 */
export interface CacheSource {
  dexie: LocalDexie;
  initialize: () => void;
  cacheStore: (store: ICacheableStore, strategy: CacheStrategy) => void;
  retrieveCache: (storeId: string) => Promise<any>;
  fetchClientMutationMap: () => Promise<any>;
  updateClientMutationMap: (clientMutationMap: Record<string, number>) => void;
  mergeClientMutationMap: (
    newMap: Record<string, number>,
    existingMap?: Record<string, number>
  ) => Promise<Record<string, number>>;
  clearCache: () => void;
}

/**
 * The type of the dependency sync
 */
export enum DependencySyncType {
  /**
   *The stores which depend on a resource will be updated immediately after the dependant resource is updated before the mutations are posted to the server using propagateDependencyChanges method on Cacheable Store
   */
  EAGER = "EAGER",
  /**
   * The stores which depend on a resource will be updated after the mutations are posted to the server using DataManager mutationMap and refreshStale
   */
  DEFERRED = "DEFERRED"
}

export type ResourceDependency = {
  resource: string;
  syncType?: DependencySyncType;
};

export enum PersistanceActionType {
  CREATE = "CREATE",
  INSERT = "INSERT",
  UPDATE = "UPDATE",
  MERGE = "MERGE",
  DELETE = "DELETE",
  CUSTOM_QUERY = "CUSTOM_QUERY",
  CUSTOM_CREATE = "CUSTOM_CREATE"
}

export interface IMutationParams {
  action: PersistanceActionType;
  query?: string;
  isMutatingSelfOnly?: boolean;
  queueParams?: IMutationQueueParams;
}

export interface IMutationQueueParams {
  isUseQueueFirstApproach: boolean;
  mutationId: string;
}
