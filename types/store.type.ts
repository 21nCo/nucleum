import type { Writable } from "svelte/store";

export interface CacheableStoreContract extends Writable<any> {
  loader: (data: any) => void;
  search?: (query: string) => Promise<any>;
}

export interface CacheableStore {
  id: string;
  refreshQuery?: string;
  dataType: StoreDataType;
  dependencies?: string[];
  cacheStrategy?: CacheStrategy;
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
  KVO = "KVO"
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

export interface DataManager {
  cacheSource: CacheSource;
}
export interface CacheSource {
  initialize: () => void;
  cacheStore: (store: CacheableStore, strategy: CacheStrategy) => void;
  retrieveCache: (storeId: string) => Promise<any>;
  fetchClientMutationMap: () => Promise<any>;
  updateClientMutationMap: (clientMutationMap: Record<string, number>) => void;
  mergeClientMutationMap: (
    newMap: Record<string, number>,
    existingMap?: Record<string, number>
  ) => Promise<Record<string, number>>;
}
