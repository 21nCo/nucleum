import type { Writable } from "svelte/store";

export interface CacheableStoreContract extends Writable<any> {
  loader: (data: any) => void;
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
