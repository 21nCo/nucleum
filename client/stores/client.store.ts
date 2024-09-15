import { get, writable } from "svelte/store";
import {
  StoreDataType,
  type IObservableStore,
  type IObservableStoreSubject,
  type IStore,
  type ResourceDependency
} from "../types/data.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { flux } from "../components/flux/flux";

export class ObservableStore<T extends IObservableStoreSubject>
  implements IObservableStore<T>
{
  id: Resource | string;
  dataType: StoreDataType;
  refreshOnAppear?: boolean;
  refreshQuery?: string;
  dependencies?: ResourceDependency[];
  mutatingResources?: string[];
  dboDependencies?: string[];
  protected subject = writable<T>();
  subscribe = this.subject.subscribe;
  update = this.subject.update;
  protected _set = this.subject.set;
  constructor(
    item: Resource | string,
    dataType: StoreDataType = StoreDataType.NA,
    params?: Pick<
      IStore,
      | "refreshOnAppear"
      | "refreshQuery"
      | "dependencies"
      | "mutatingResources"
      | "dboDependencies"
    >
  ) {
    this.id = item;
    this.dataType = dataType;
    this.refreshOnAppear = params?.refreshOnAppear || false;
    this.refreshQuery = params?.refreshQuery;
    this.dependencies = params?.dependencies;
    this.mutatingResources = params?.mutatingResources;
    this.dboDependencies = params?.dboDependencies;
    // dataManager.retrieveCache(this.id).then((x: T | null) => {
    //   if (!x) {
    //     return;
    //   } else {
    //     this._set(x);
    //   }
    // });
  }
  set(val: T) {
    this._set(val);
  }
  get() {
    return get(this.subject);
  }
  /**
   * Caches the data locally
   */
  protected async cache() {
    // dataManager.cache(this);
  }
  /**
   * This function gets triggered from dataManager when the data is fetched from the server.
   * @param data
   */
  loader(data: T) {
    this._set({ ...data });
    this.cache();
  }
  refresh(params?: any): Promise<any> {
    flux.refresh(this.id, params?.isShowRefreshingState);
    return Promise.resolve(true);
  }
}
