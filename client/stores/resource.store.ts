import { writable } from "svelte/store";
import type { DbRecord } from "../types/dbrecord.type";
import { activeResourceFilter, debouncer } from "../utils/utils";
import {
  PersistanceActionType,
  StoreDataType,
  type IStore,
  type IMutationQueueParams,
  type IObservableStoreSubject,
  type IObservableStore
} from "../types/data.type";
import type { Item } from "../types/item.enum";
import { prefixTable } from "../utils/text.utils";
import { generateUID } from "../utils/utils";
import { dataManager } from "../persistence/dataManager";
import { ObservableStore } from "./client.store";

export class ActiveResourceStore<T, U extends ResourceStore> {
  id: string;
  protected store = writable<T>();
  protected debouncedPersistBlock: any;
  protected resourceStore: U;
  protected currentUserId: string;
  subscribe = this.store.subscribe;
  set = this.store.set;
  update = this.store.update;
  constructor(id: string, resourceStore: U, currentUserId: string) {
    this.id = id;
    this.resourceStore = resourceStore;
    this.currentUserId = currentUserId;
    const updatePropagator = (val: Partial<DbRecord>) =>
      this.resourceStore.modify(this.id, val);
    this.debouncedPersistBlock = debouncer(updatePropagator, 2000);
  }
  modify(val: Partial<T>) {
    this.update((prev: T) => ({ ...prev, ...val }));
    return this.resourceStore.modify(this.id, val);
  }
  debouncedModify(val: Partial<T>) {
    this.update((prev: T) => ({ ...prev, ...val }));
    return this.debouncedPersistBlock(val);
  }
  /**
   * @deprecated - use {@link debouncedModify} instead
   */
  propagateTitleChange(label: string) {
    return this.debouncedPersistBlock({ label });
  }
  delete() {
    this.update((prev: T) => ({
      ...prev,
      trashInformation: {
        deletedBy: this.currentUserId,
        deletedAt: new Date().toISOString()
      }
    }));
    return this.resourceStore.delete(this.id);
  }
  archive() {
    this.update((prev: T) => ({
      ...prev,
      isArchived: true,
      modifiedBy: this.currentUserId,
      modifiedAt: new Date().toISOString()
    }));
    return this.resourceStore.modify(this.id, { isArchived: true });
  }
  unarchive() {
    this.update((prev: T) => ({
      ...prev,
      isArchived: false,
      modifiedBy: this.currentUserId,
      modifiedAt: new Date().toISOString()
    }));
    return this.resourceStore.modify(this.id, { isArchived: false });
  }
  restore() {
    this.update((prev: T) => ({ ...prev, trashInformation: undefined }));
    return this.resourceStore.modify(this.id, { trashInformation: undefined });
  }
}

/**
 * For IFR Resources - delegated from active resource stores.
 */
export class ResourceStore implements IStore {
  id: Item;
  dataType: StoreDataType = StoreDataType.IFR;
  priorityRefreshOnAppAppear: boolean = false;
  refreshQuery?: string;
  currentUserId: string;
  mutatingResources: string[];
  constructor(
    resourceType: Item,
    currentUserId: string,
    params?: Pick<IStore, "priorityRefreshOnAppAppear" | "refreshQuery">
  ) {
    this.id = resourceType;
    this.mutatingResources = [resourceType];
    this.currentUserId = currentUserId;
    this.priorityRefreshOnAppAppear =
      params?.priorityRefreshOnAppAppear || false;
    this.refreshQuery = params?.refreshQuery;
  }
  refresh() {
    return dataManager.refreshForIFR(this.id);
  }
  resolveRefreshQuery() {
    return this.refreshQuery ?? "";
  }
  create(
    resource: Partial<DbRecord>,
    customQuery?: string,
    mutatationQueueParams?: IMutationQueueParams
  ) {
    let data;
    let commonProps = {
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      createdBy: this.currentUserId,
      modifiedBy: this.currentUserId
    };
    if (customQuery && "resources" in resource) {
      data = {
        ...resource,
        resources: resource.resources?.map((r) => ({
          ...r,
          id: r.id ?? prefixTable(generateUID(), this.id),
          ...commonProps
        }))
      };
    } else {
      data = {
        ...resource,
        id: resource.id ?? prefixTable(generateUID(), this.id),
        ...commonProps
      };
    }
    return dataManager.performMutationForIFR(this.id, data, {
      action: customQuery
        ? PersistanceActionType.CUSTOM_CREATE
        : PersistanceActionType.CREATE,
      query: customQuery,
      queueParams: mutatationQueueParams
    });
  }
  async modify(
    id: string,
    resource: Partial<DbRecord>,
    mutatationQueueParams?: IMutationQueueParams
  ) {
    const data: Partial<DbRecord> = {
      id,
      ...resource,
      modifiedBy: this.currentUserId
    };
    return dataManager.performMutationForIFR(this.id, data, {
      action: PersistanceActionType.MERGE,
      queueParams: mutatationQueueParams
    });
  }
  async delete(id: string, mutatationQueueParams?: IMutationQueueParams) {
    return dataManager.performMutationForIFR(
      this.id,
      { id, modifiedBy: this.currentUserId },
      {
        action: PersistanceActionType.DELETE,
        queueParams: mutatationQueueParams
      }
    );
  }
  get() {}
}

/**
 * Extensible FIR resource store.
 */
export class ResourceFIRStore<
    T extends { id: string },
    S extends IObservableStoreSubject & {
      items: T[];
      filtered?: T[];
    } = IObservableStoreSubject & {
      items: T[];
      filtered?: T[];
    }
  >
  extends ObservableStore<S>
  implements IObservableStore<S>
{
  id: Item;
  defaultFilter?: (items: T[]) => T[] | undefined;
  constructor(
    item: Item,
    defaultFilter?: (items: T[]) => T[],
    params?: Pick<IStore, "priorityRefreshOnAppAppear" | "refreshQuery">
  ) {
    super(item, StoreDataType.FIR, params);
    this.id = item;
    this.mutatingResources = [item];
    this.defaultFilter = defaultFilter;
    dataManager.retrieveCache(this.id).then((x: S | null) => {
      if (!x) {
        const initialState = this.createInitialState();
        this._set(initialState);
        this.cache();
      } else {
        x.filtered = this.defaultFilter ? this.defaultFilter(x.items) : x.items;
        this._set(x);
      }
    });
  }
  private createInitialState(): S {
    const baseState: IObservableStoreSubject = {
      isRefreshing: false,
      isPageRefreshing: false
    };
    return {
      ...baseState,
      items: [] as T[],
      filtered: [] as T[]
    } as S;
  }
  private async _mutation(action: PersistanceActionType, record: string | T) {
    const data = typeof record === "string" ? { id: record } : record;
    return dataManager.performMutation(this.id, data, { action });
  }
  loader(data: S) {
    data.filtered = this.defaultFilter
      ? this.defaultFilter(data.items)
      : data.items;
    // data.filtered = data.items;
    this._set(data);
    this.cache();
  }

  async search(query: string) {
    if (!query) return;
    return this.get()
      .items.filter(activeResourceFilter)
      .filter(
        (x) =>
          hasLabel(x) && x.label.toLowerCase().includes(query.toLowerCase())
      );

    function hasLabel<T>(x: T): x is T & { label: string } {
      return (
        typeof x === "object" &&
        x !== null &&
        "label" in x &&
        typeof (x as any).label === "string"
      );
    }
  }
  async create(data: Omit<T, "id">, id?: string) {
    const newId = id ?? prefixTable(generateUID(), this.id);
    const newItem = { ...data, id: newId } as T;
    this._mutation(PersistanceActionType.CREATE, newItem);
    this.update((x: S) => {
      x.items.push(newItem);
      return x;
    });
    this.cache();
  }
  async modify(item: T) {
    this._mutation(PersistanceActionType.UPDATE, item);
    this.update((x: S) => {
      x.items = x.items.filter((t) => t.id != item.id);
      x.items.push(item);
      return x;
    });
    this.cache();
  }
  async delete(id: string) {
    this._mutation(PersistanceActionType.DELETE, id);
    this.update((x: S) => {
      x.items = x.items.filter((t) => t.id != id);
      return x;
    });
    this.cache();
  }
}
