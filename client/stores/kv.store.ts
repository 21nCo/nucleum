import { get, writable } from "svelte/store";
import {
  PersistanceActionType,
  StoreDataType,
  type ICacheableSvelteStore,
  type ICacheableStore
} from "../types/data.type";
import { dataManager } from "../persistence/dataManager";
import { deepCopy, objIsEmpty, shallowDiff } from "../utils/obj.utils";
import { persistLocally, retrieveLocally } from "../utils/storage.utils";
import type { Item } from "../types/item.enum";

export class KeyValueStore<T>
  implements ICacheableSvelteStore
{
  id: Item;
  dataType: StoreDataType = StoreDataType.KVO;
  priorityRefreshOnAppAppear: boolean = false;
  isSynchronousCache: boolean = false;
  protected previousValue: string = "";
  protected seed: T;
  protected store = writable<T & ICacheableStore>();
  subscribe = this.store.subscribe;
  update = this.store.update;
  private setRaw = this.store.set;
  constructor(
    item: Item,
    seed: T,
    params: Omit<ICacheableStore, "id" | "dataType">
  ) {
    this.id = item;
    this.seed = seed;
    this.priorityRefreshOnAppAppear =
      params.priorityRefreshOnAppAppear || false;
    this.isSynchronousCache = params.isSynchronousCache || false;
    if (params.isSynchronousCache) {
      const localCacheValue = retrieveLocally(this.id);
      if (localCacheValue) {
        const cachedValue = {
          ...localCacheValue,
          ...this.resolveStoreConstants()
        };
        this.setRaw(cachedValue);
        this.previousValue = JSON.stringify(cachedValue);
      } else {
        const seed = {
          ...deepCopy(this.seed)
        };
        this.setNewValue(seed);
      }
    } else {
      dataManager.retrieveCache(this.id).then((x) => {
        if (!x) {
          const seed = {
            ...deepCopy(this.seed)
          };
          this.setNewValue(seed);
        }
        const cachedValue = {
          ...x,
          ...this.resolveStoreConstants()
        };
        this.setRaw(cachedValue);
        this.previousValue = JSON.stringify(cachedValue);
      });
    }
  }

  private resolveStoreConstants() {
    return {
      id: this.id,
      dataType: this.dataType,
      priorityRefreshOnAppAppear: this.priorityRefreshOnAppAppear,
      isSynchronousCache: this.isSynchronousCache
    };
  }
  /**
   * Caches the data locally
   * @param n - store to be cached
   */
  protected async cache(n: ICacheableStore) {
    if (this.isSynchronousCache) {
      persistLocally(this.id, n);
      return;
    }
    dataManager.cache(n);
  }
  /**
   * Persists the data to the server - uses MERGE action
   * @param n
   */
  protected async persist(n: Partial<T>) {
    // await persistance.update({
    //   ...n,
    //   id: this.item,
    //   modifiedAt: new Date().toISOString()
    // });
    return dataManager.performMutation(
      this.id,
      {
        ...n,
        id: this.id
      },
      { action: PersistanceActionType.MERGE }
    );
  }
  /**
   * Sets the new value of the store and caches it, but doesn't persist it
   * @param x - new value of the store
   */
  protected setNewValue(x: T) {
    const newValue = { ...x, ...this.resolveStoreConstants() };
    this.setRaw(newValue);
    this.previousValue = JSON.stringify(newValue);
    this.cache(newValue as ICacheableStore);
  }
  /**
   * This function gets triggered from dataManager when the data is fetched from the server.
   * @param data
   */
  loader(data: T) {
    this.setNewValue({ ...data });
  }
  /**
   * Loads the seed data initialized in the constructor and persists it
   * @returns
   */
  loadSeedData() {
    const seed = {
      ...deepCopy(this.seed)
    };
    this.setNewValue(seed);
    return this.persist(seed);
  }
  /**
   * Svelte store method which gets triggered on direct update of values using $ (dollar) syntax
   * @param newValue
   */
  set(newValue: T) {
    let changedProperties: any = {};
    if (this.previousValue) {
      let differences = shallowDiff(newValue, JSON.parse(this.previousValue));
      differences.forEach((key: string) => {
        changedProperties[key] = newValue[key as keyof T];
      });
    }
    console.log({
      previousValue: this.previousValue ? JSON.parse(this.previousValue) : null,
      newValue,
      changedProperties
    });
    this.setNewValue(newValue);
    if (!objIsEmpty(changedProperties)) this.persist(changedProperties);
  }
  /**
   * Modifies the store and persists the changes
   * @param n
   * @returns
   */
  async modify(n: Partial<T>) {
    const val = get(this.store);
    this.setNewValue({ ...val, ...n });
    return this.persist(n);
  }
  /**
   * Gets the current value of the store
   * @returns
   */
  get() {
    return get(this.store);
  }
}
