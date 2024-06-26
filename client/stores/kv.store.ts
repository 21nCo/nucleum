import { get, writable } from "svelte/store";
import {
  PersistanceActionType,
  StoreDataType,
  type ICacheableStore
} from "../types/data.type";
import { dataManager } from "../persistence/dataManager";
import { Persistence } from "../persistence/persistence";
import { deepCopy, objIsEmpty, shallowDiff } from "../utils/obj.utils";
import { persistLocally, retrieveLocally } from "../utils/storage.utils";
import type { Item } from "../types/item.enum";
const persistance = new Persistence();

export class KeyValueStore<T = ICacheableStore> {
  item: Item;
  dataType: StoreDataType = StoreDataType.KVO;
  priorityRefreshOnAppAppear: boolean = false;
  isSynchronousCache: boolean = false;
  previousValue: string = "";
  seed: T;
  protected store = writable<T>();
  subscribe = this.store.subscribe;
  setRaw = this.store.set;
  update = this.store.update;
  constructor(
    item: Item,
    seed: T,
    params: Omit<ICacheableStore, "id" | "dataType">
  ) {
    this.item = item;
    this.seed = seed;
    this.priorityRefreshOnAppAppear =
      params.priorityRefreshOnAppAppear || false;
    this.isSynchronousCache = params.isSynchronousCache || false;
    if (params.isSynchronousCache) {
      const localCacheValue = retrieveLocally(this.item);
      if (localCacheValue) {
        const cachedValue = {
          ...localCacheValue,
          ...this.resolveStoreConstants()
        };
        this.setRaw(cachedValue);
        this.previousValue = JSON.stringify(cachedValue);
      } else {
        const seed = {
          ...deepCopy(this.seed),
          ...this.resolveStoreConstants()
        };
        this.setNewValue(seed);
      }
    } else {
      dataManager.retrieveCache(this.item).then((x) => {
        if (!x) {
          const seed = {
            ...deepCopy(this.seed),
            ...this.resolveStoreConstants()
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

  resolveStoreConstants() {
    return {
      id: this.item,
      dataType: this.dataType,
      priorityRefreshOnAppAppear: this.priorityRefreshOnAppAppear
    };
  }

  async cache(n: ICacheableStore) {
    if (this.isSynchronousCache) {
      persistLocally(this.item, n);
      return;
    }
    dataManager.cache(n);
  }
  async persist(n: Partial<T>) {
    // await persistance.update({
    //   ...n,
    //   id: this.item,
    //   modifiedAt: new Date().toISOString()
    // });
    dataManager.performMutation(
      this.item,
      {
        ...n,
        id: this.item
      },
      { action: PersistanceActionType.MERGE }
    );
    // this.cache(get(this) as ICacheableStore);
  }
  setNewValue(x: T) {
    const newValue = { ...x, ...this.resolveStoreConstants() };
    this.setRaw(newValue);
    this.previousValue = JSON.stringify(newValue);
    this.cache(newValue as ICacheableStore);
  }
  loader(data: T) {
    this.setNewValue({ ...data, ...this.resolveStoreConstants() } as T);
  }
  loadSeedData() {
    const seed = {
      ...deepCopy(this.seed),
      ...this.resolveStoreConstants()
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
}
