import { get, writable } from "svelte/store";
import {
  StoreDataType,
  type IObservableStore,
  type IObservableStoreSubject,
  type IStore
} from "../types/data.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";

export class ObservableStore<T extends IObservableStoreSubject>
  implements IObservableStore<T>
{
  id: Resource | string;
  dataType: StoreDataType;
  dboDependencies?: string[];
  protected subject = writable<T>();
  subscribe = this.subject.subscribe;
  update = this.subject.update;
  protected _set = this.subject.set;
  constructor(
    item: Resource | string,
    dataType: StoreDataType = StoreDataType.NA,
    params?: Pick<IStore, "dboDependencies">
  ) {
    this.id = item;
    this.dataType = dataType;
    this.dboDependencies = params?.dboDependencies;
  }
  set(val: T) {
    this._set(val);
  }
  get() {
    return get(this.subject);
  }

  /**
   * This function gets triggered from dataManager when the data is fetched from the server.
   * @param data
   */
  loader(data: T) {
    this._set({ ...data });
  }
}
