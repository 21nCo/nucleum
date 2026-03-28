import { ObservableStore } from "@21n/stores/client.store";
import { logger } from "@21n/components/debug/logger.client";
import {
  type IObservableStore,
  type IStore,
  StoreDataType
} from "@21n/types/data.type";
import type { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { debouncer } from "@21n/utils/utils";
import { deepCopy, objIsEmpty, shallowDiff } from "@21n/shared-utils/obj.utils";
import { flux } from "@21n/components/flux/flux";
import { isExtensionEnvironment } from "@21n/utils/browser.utils";
import { extensionFlux } from "@21n/components/flux/fluxExtentionMediator";
import { FluxMethod } from "@21n/components/flux/flux.type";
import { parse, stringify } from "@21n/shared-utils/json.utils";

export const kvStores = new Map<Resource, KeyValueStore<any>>();
export class KeyValueStore<T>
  extends ObservableStore<T>
  implements IObservableStore<T>
{
  declare id: Resource;
  isPreventAutoPersist: boolean = false;
  isInitialized: boolean = false;
  protected previousValue: string = "";
  seed: T;
  private _debouncedPersist = debouncer(this.persist, 3000);
  isExtensionEnvironment: boolean = false;
  constructor(
    item: Resource,
    seed: T,
    params?: {
      isPreventAutoPersist?: boolean;
    }
  ) {
    super(item, StoreDataType.KVO);
    this.id = item;
    this.seed = seed;
    this.isPreventAutoPersist = params?.isPreventAutoPersist || false;
    this.isExtensionEnvironment = isExtensionEnvironment();
    this._set(seed);
  }
  /**
   * Sets the new value of the store and caches it, but doesn't persist it
   * @param x - new value of the store
   */
  private __set(x: T) {
    const newValue = { ...x };
    this._set(newValue);
    this.previousValue = stringify(newValue);
  }
  /**
   * Persists the data to the server - uses MERGE action
   * Doesn't cache or update the store itself. Use modify for that
   * @param n
   */
  protected async persist(n: Partial<T> | undefined = undefined) {
    if (!n) n = this.get();
    if (this.isExtensionEnvironment) {
      return extensionFlux({
        method: FluxMethod.KV_MERGE,
        args: {
          storeId: this.id,
          data: n
        }
      });
    }
    return flux?.kvMerge(this.id, n);
  }
  /**
   * This function gets triggered from flux when the data is fetched from the server.
   * @param data
   */
  loader(data: T) {
    // console.log({ context: "kv.store loader", id: this.id, data });
    if (!data || typeof data !== "object") return;
    this.isInitialized = true;
    this.__set({ ...data });
  }
  /**
   * Loads the seed data initialized in the constructor and persists it
   * @returns
   */
  loadSeedData() {
    const seed = {
      ...deepCopy(this.seed)
    };
    this.__set(seed);
    return this.persist(seed);
  }
  /**
   * Svelte store method which gets triggered on direct update of values using $ (dollar) syntax
   * @param newValue
   */
  set(newValue: T) {
    let changedProperties: any = {};
    if (this.previousValue) {
      let differences = shallowDiff(newValue, parse(this.previousValue));
      differences.forEach((key: string) => {
        changedProperties[key] = newValue[key as keyof T];
      });
    }
    // console.log({
    //   previousValue: this.previousValue ? parse(this.previousValue) : null,
    //   newValue,
    //   changedProperties
    // });
    this.__set(newValue);
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
  async modify(
    n: Partial<T>,
    params: {
      isPersist?: boolean;
      isDebouncedPersist?: boolean;
      isPreventCachingDefault?: boolean;
    } = {
      isPersist: true
    }
  ) {
    const val = this.get();
    if (params.isPreventCachingDefault) {
      this._set({ ...val, ...n });
      return;
    }
    this.__set({ ...val, ...n });
    if (params?.isDebouncedPersist) return this._debouncedPersist(n);
    else if (params?.isPersist) return this.persist(n);
  }

  static resolve<T extends KeyValueStore<any>>(
    this: new () => T,
    item: Resource
  ) {
    if (!kvStores.has(item)) {
      kvStores.set(item, new this());
    }
    return kvStores.get(item)! as T;
  }
}
