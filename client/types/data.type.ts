import type { Writable } from "svelte/store";
import type { LocalDexie } from "$local/local";
import type { ISurrealDatabase } from "./db.type";
import type { RecordId } from "surrealdb.js";
import type { ResourceActionType } from "../components/flux/resourceStores/resource.type";
import type { SearchType } from "../products/memotron/node/node.type";

/**
 * The operations which can be performed on a cacheable store
 */
export interface IObservableStore<T extends IObservableStoreSubject>
  extends IStore,
    Writable<T> {}

export interface IObservableStoreSubject {
  /**
   * The state of the store when it is refreshing
   */
  isRefreshing?: boolean;
  /**
   * The state of the store the page which this particular store is part of is refreshing - will be set when dataManager.refreshPage is triggered
   */
  isPageRefreshing?: boolean;
}

/**
 * Extensible interface for the store
 */
export interface IStore {
  /**
   * The unique identifier of the store which is used to cache and retrieve the store. see dataManager
   */
  id: string;
  /**
   * The type of data the store holds
   */
  dataType: StoreDataType;

  isInMemory?: boolean;

  /**
   * The data in the store
   * @returns the data in the store
   */
  get: () => any;

  /**
   * @deprecated - use ComponentLayer to listen to syncDown and change events
   * The query to be used to refresh the store
   */
  refreshQuery?: string;

  /**
   * @deprecated - use resourceDependencies instead
   * The resources on which the store depends on
   */
  dependencies?: ResourceDependency[];

  /**
   * @deprecated - use ComponentLayer to listen to syncDown and change events
   * The resources on which the store depends on
   */
  resourceDependencies?: string[];

  /**
   * @deprecated - use ComponentLayer to listen to syncDown and change events
   * The resources which will be mutated by the store
   */
  mutatingResources?: string[];
  /**
   * @deprecated
   * The cache strategy to use for the store
   */
  cacheStrategy?: CacheStrategy;
  /**
   * @deprecated
   * Setting this true will refresh the store when the app appears before even performing stale check
   */
  refreshOnAppear?: boolean;

  /**
   * @deprecated
   * When this is turned on, local storage is used to cache the store.
   */
  isSynchronousCache?: boolean;
  /**
   * Prevents the store from being persisted to remote database when the store is updated using $ syntax and therefore set method
   */
  isPreventAutoPersist?: boolean;
  /**
   * Dbo function dependencies that need to be defined on database before the store can be used
   */
  dboDependencies?: string[];
  loader?: (data: any) => void;
  search?: (query: string) => any;
  /**
   *
   * @deprecated - use ComponentLayer to listen to syncDown and change events
   *
   */
  resolveRefreshQuery?: () => string;
  /**
   *
   * @deprecated - use ComponentLayer to listen to syncDown and change events
   *
   */
  refresh?: (params?: any) => Promise<any>;
  /**
   *
   * @deprecated - use ComponentLayer to listen to syncDown and change events
   *
   */
  propagateDependencyChanges?: (params: any) => void;
}

/**
 * The type of data the store holds
 */
export enum StoreDataType {
  /**
   * @deprecated - use ResourceStore with inMemory: true
   * Finite and infrequently mutated Records
   */
  FIR = "FIR",
  /**
   *
   * Infinite and frequently mutated Records
   */
  IFR = "IFR",
  /**
   * @deprecated
   * Finite and Constant system Records
   */
  FCR = "FCR",
  /**
   * Key Value Object - cached and persisted to remote database
   */
  KVO = "KVO",
  /**
   * Not Applicable - Non persisting Client store for UI state management
   */
  NA = "NA"
}

/**
 * The cache strategy to use for the store.
 */
export enum CacheStrategy {
  /**
   * The whole store is cached as key value pairs
   */
  WHOLE = "WHOLE",
  /**
   * Only the records are merged - using dexie.
   */
  MERGE_RECORDS = "MERGE_RECORDS",
  /**
   * Prevents local caching of the store when cacheStrategy is set to this value
   */
  NO_CACHE = "NO_CACHE"
}

/**
 * Data manager which is responsible for managing the cache and the stores in the application
 */
export interface DataManager {
  cacheSource: CacheSource;
  db: ISurrealDatabase;
  cacheableStoresTable: IStore[];
}

/**
 * The source of the cache which handles the caching and retrieval of the cache
 */
export interface CacheSource {
  dexie: LocalDexie;
  initialize: () => void;
  cacheKvStore: (id: string, data: any) => void;
  retrieveKvCache: (storeId: string) => Promise<any>;
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

export enum PersistenceActionType {
  CREATE = "CREATE",
  INSERT = "INSERT",
  /**
   * Replaces the existing record with the new data
   */
  REPLACE = "REPLACE",
  /**
   * Merges the existing record properties with the provided properties
   */
  MERGE = "MERGE",
  /**
   * Deletes the record.
   *
   * Note: Use this to completely delete the record. To move to trash, use MERGE with trashInformation property.
   */
  DELETE = "DELETE",
  BULK_MERGE = "BULK_MERGE",
  CUSTOM = "CUSTOM"
}

export interface IMutationParams {
  action: PersistenceActionType;
  query?: string;
  isMutatingSelfOnly?: boolean;
  queueParams?: IMutationQueueParams;
  cacheStrategy?: CacheStrategy;
}

export interface IMutationQueueParams {
  /**
   * If true, the mutation will be queued and will be persisted to the server at an interval usually 1-2 seconds - to combine multiple mutations into one.
   */
  isUseQueueFirstApproach: boolean;
  mutationId: string;
}

export type IInsertMutation<T> = {
  action: PersistenceActionType.INSERT;
  records: T[];
};

export type IReplaceMutation<T> = {
  action: PersistenceActionType.REPLACE;
  record: T;
};

export type IMergeMutation<T> = {
  action: PersistenceActionType.MERGE;
  record: Partial<T>;
};

export type IDeleteMutation = {
  action: PersistenceActionType.DELETE;
  recordId: string;
};

export type IBulkEditMutation<T> = {
  action: PersistenceActionType.BULK_MERGE;
  records: T[];
};

export type ICustomMutationParams = {
  action: PersistenceActionType.CUSTOM;
  query: string;
  data?: any;
};

export type IMutationParamsv2<T> =
  | IInsertMutation<T>
  | IReplaceMutation<T>
  | IMergeMutation<T>
  | IDeleteMutation
  | IBulkEditMutation<T>
  | ICustomMutationParams;

export type IPrimitiveDbDataType = string | number | boolean;

export type IResourceFilterValue =
  | IPrimitiveDbDataType
  | undefined
  | IPrimitiveDbDataType[]
  | {
      from: IPrimitiveDbDataType;
      to: IPrimitiveDbDataType;
    };

export type IResourceSelectOrderBy = {
  [key: string]: "asc" | "desc";
};

export enum ResourceFilterCondition {
  EQUALS = "EQUALS",
  NOT_EQUALS = "NOT_EQUALS",
  GREATER_THAN = "GREATER_THAN",
  GREATER_THAN_OR_EQUALS = "GREATER_THAN_OR_EQUALS",
  LESS_THAN = "LESS_THAN",
  LESS_THAN_OR_EQUALS = "LESS_THAN_OR_EQUALS",
  IN = "IN",
  NOT_IN = "NOT_IN",
  CONTAINS = "CONTAINS",
  NOT_CONTAINS = "NOT_CONTAINS",
  STARTS_WITH = "STARTS_WITH",
  ENDS_WITH = "ENDS_WITH",
  IS_NULL = "IS_NULL",
  IS_NOT_NULL = "IS_NOT_NULL"
}

export type IResourceFilter = {
  property: string;
  value: IResourceFilterValue;
  condition: ResourceFilterCondition;
};

export enum FilterCombinationMethod {
  AND = "AND",
  OR = "OR"
}

export type IResourceFilterGroup = {
  filters: (IResourceFilter | IResourceFilterGroup)[];
  condition: FilterCombinationMethod;
};

export type IResourceSelectFilters =
  | {
      [key: string]: IResourceFilterValue;
    }
  | IResourceFilterGroup;

export type IResourceSelectParams = {
  /**
   * Should the searh be semantic or full text.
   */
  searchType?: SearchType;
  /**
   * Properties to be selected, that is items to be present in select statement.
   * Eg: SELECT properties[0], properties[1], properties[2] FROM table;
   */
  properties?: string[];
  /**
   * Filters to be applied on the resources.
   * This will be translated to the where clause in case of Surreal provider.
   *
   * Use `IResourceFilterGroup` to combine multiple filters using AND or OR condition in cases of user facing filters. For rest of the application system cases, basic filters in combination with search can be used.
   *
   */
  filters?: IResourceSelectFilters;

  /**
   * Search to be applied on the resources.
   * Provided properties will be combined using `OR` condition.
   *
   * Note: This uses search index and search index should have been defined on the database provider.
   *
   */
  search?: {
    query: string;
    properties?: string[];
    isCaseSensitive?: boolean;
  };
  /**
   *
   * Use only if filters doesn't cover the use case.
   *
   * The raw `WHERE` clause to be used in case of Surreal provider if filters doesn't cover the use case. This will be appended to the filters if filters are also provided.
   */
  whereClause?: string | string[];
  /**
   * The number of records to be returned.
   */
  limit?: number;
  /**
   * The number of records to be skipped.
   */
  offset?: number;
  /**
   * The fields to be grouped by.
   */
  groupBy?: string[];
  /**
   * The fields to be ordered by.
   */
  orderBy?: IResourceSelectOrderBy;
  /**
   * The fields to be omitted.
   * This will use OMIT clause in case of Surreal provider.
   */
  omit?: string[];
};

export type IRecordId = RecordId | string;

export type IMutation = {
  id: string;
  createdAt: string;
  modifiedAt: string;
  dapId: string;
  userId: string;
  resource: string;
  resourceId?: IRecordId;
  action: ResourceActionType;
  params: IMutationParamsv2<any>;
};
