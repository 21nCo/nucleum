import { dataManager } from "$lib/client/persistence/dataManager";
import { ObservableStore } from "$lib/client/stores/client.store";
import { logger } from "$lib/client/stores/log.store";
import {
  type IMutationQueueParams,
  type IObservableStore,
  type IObservableStoreSubject,
  type IStore,
  PersistanceActionType,
  StoreDataType
} from "$lib/client/types/data.type";
import type { Resource } from "$lib/client/components/resourceStores/resource.enum";
import {
  persistLocally,
  retrieveLocally
} from "$lib/client/utils/storage.utils";
import { debouncer } from "$lib/client/utils/utils";
import { deepCopy, objIsEmpty, shallowDiff } from "$lib/shared/utils/obj.utils";

export class KeyValueStore<T extends IObservableStoreSubject>
  extends ObservableStore<T>
  implements IObservableStore<T>
{
  declare id: Resource;
  isSynchronousCache: boolean = false;
  isPreventAutoPersist: boolean = false;
  protected previousValue: string = "";
  seed: T;
  private _debouncedPersist = debouncer(this.persist, 3000);
  constructor(
    item: Resource,
    seed: T,
    params?: Omit<IStore, "id" | "dataType" | "get">
  ) {
    super(item, StoreDataType.KVO, params);
    this.id = item;
    this.seed = seed;
    this.isSynchronousCache = params?.isSynchronousCache || false;
    this.isPreventAutoPersist = params?.isPreventAutoPersist || false;
    if (params?.isSynchronousCache) {
      const localCacheValue = retrieveLocally(this.id);
      if (localCacheValue) {
        this._set(localCacheValue);
        this.previousValue = JSON.stringify(localCacheValue);
      } else {
        const seed = {
          ...deepCopy(this.seed)
        };
        this._setAndCache(seed);
      }
    } else {
      dataManager.retrieveCache(this.id).then((x) => {
        logger.log({
          context: "fetching from cache",
          id: this.id,
          x,
          seed: this.seed
        });
        if (!x) {
          const seed = {
            ...deepCopy(this.seed)
          };
          this._setAndCache(seed);
        } else {
          this._set(x);
          this.previousValue = JSON.stringify(x);
        }
      });
    }
  }
  /**
   * Caches the data locally
   */
  protected async cache() {
    if (this.isSynchronousCache) {
      persistLocally(this.id, this.get());
      return;
    }
    dataManager.cache(this);
  }
  /**
   * Sets the new value of the store and caches it, but doesn't persist it
   * @param x - new value of the store
   */
  private _setAndCache(x: T) {
    const newValue = { ...x };
    this._set(newValue);
    this.previousValue = JSON.stringify(newValue);
    this.cache();
  }
  /**
   * Persists the data to the server - uses MERGE action
   * Doesn't cache or update the store itself. Use modify for that
   * @param n
   */
  protected async persist(
    n: Partial<T> | undefined = undefined,
    queueParams?: IMutationQueueParams
  ) {
    if (!n) n = this.get();
    return dataManager.performMutation(
      this.id,
      {
        ...n,
        id: this.id
      },
      { action: PersistanceActionType.MERGE, queueParams }
    );
  }
  /**
   * This function gets triggered from dataManager when the data is fetched from the server.
   * @param data
   */
  loader(data: T) {
    // console.log({ context: "kv.store loader", id: this.id, data });
    if (!data.id) return;
    this._setAndCache({ ...data });
  }
  /**
   * Loads the seed data initialized in the constructor and persists it
   * @returns
   */
  loadSeedData() {
    const seed = {
      ...deepCopy(this.seed)
    };
    this._setAndCache(seed);
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
    // console.log({
    //   previousValue: this.previousValue ? JSON.parse(this.previousValue) : null,
    //   newValue,
    //   changedProperties
    // });
    this._setAndCache(newValue);
    if (!objIsEmpty(changedProperties) && !this.isPreventAutoPersist)
      this.persist(changedProperties);
  }
  /**
   * Modifies the store, caches and persists the changes. Persist will be debounced if isDebouncedPersist is true and will be avoided if isPersist is false
   *
   * both caching and persisting are avoided if isPreventCachingDefault is true
   * @param n
   * @returns
   */
  protected async modify(
    n: Partial<T>,
    params: {
      isPersist?: boolean;
      isDebouncedPersist?: boolean;
      isPreventCachingDefault?: boolean;
      queueParams?: IMutationQueueParams;
    } = {
      isPersist: true
    }
  ) {
    const val = this.get();
    if (params.isPreventCachingDefault) {
      this._set({ ...val, ...n });
      return;
    }
    this._setAndCache({ ...val, ...n });
    if (params?.isDebouncedPersist) return this._debouncedPersist(n);
    else if (
      params?.isPersist ||
      (params?.isPersist != false && params?.queueParams)
    )
      return this.persist(n, params?.queueParams);
  }
}
