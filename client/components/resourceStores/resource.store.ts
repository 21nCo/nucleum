import { writable } from "svelte/store";
import {
  activeResourceFilter,
  debouncer,
  generateUID
} from "../../utils/utils";
import {
  PersistanceActionType,
  StoreDataType,
  type IStore,
  type IMutationQueueParams,
  type IObservableStoreSubject,
  type IObservableStore
} from "../../types/data.type";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { prefixTable } from "../../../shared/utils/text.utils";
import { dataManager } from "../../persistence/dataManager";
import { ObservableStore } from "../../stores/client.store";
import { resolveCurrentUserId } from "../../utils/account.utils";
import type {
  IResourceBase,
  IResource,
  ITrashInformation
} from "./resource.type";

export class ActiveResourceStore<
  T extends IResource,
  U extends ResourceStore<T>
> {
  id: string;
  protected store = writable<T>();
  protected debouncedPersistBlock: any;
  protected resourceStore: U;
  protected currentUserId?: string;
  subscribe = this.store.subscribe;
  set = this.store.set;
  update = this.store.update;
  constructor(id: string, resourceStore: U) {
    this.id = id;
    this.resourceStore = resourceStore;
    resolveCurrentUserId().then((x) => {
      this.currentUserId = x;
    });
    const updatePropagator = (val: Partial<T>) =>
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
    return this.resourceStore.trash(this.id);
  }
  archive() {
    this.update((prev: T) => ({
      ...prev,
      isArchived: true,
      modifiedBy: this.currentUserId,
      modifiedAt: new Date().toISOString()
    }));
    return this.resourceStore.modify(this.id, {
      isArchived: true
    } as Partial<T>);
  }
  unarchive() {
    this.update((prev: T) => ({
      ...prev,
      isArchived: false,
      modifiedBy: this.currentUserId,
      modifiedAt: new Date().toISOString()
    }));
    return this.resourceStore.modify(this.id, {
      isArchived: false
    } as Partial<T>);
  }
  restore() {
    this.update((prev: T) => ({ ...prev, trashInformation: undefined }) as T);
    return this.resourceStore.modify(this.id, {
      trashInformation: undefined
    } as Partial<T>);
  }
}

/**
 * For IFR Resources
 */
export class ResourceStore<T extends IResourceBase> implements IStore {
  id: Resource;
  dataType: StoreDataType = StoreDataType.IFR;
  priorityRefreshOnAppAppear: boolean = false;
  refreshQuery?: string;
  currentUserId?: string;
  mutatingResources: string[];
  constructor(
    resourceType: Resource,
    params?: Pick<IStore, "priorityRefreshOnAppAppear" | "refreshQuery">
  ) {
    this.id = resourceType;
    resolveCurrentUserId().then((x) => {
      this.currentUserId = x;
    });
    this.mutatingResources = [resourceType];
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
  /**
   * Creates a resource or a list of resources. If the input param is a list, it will be inserted into the database.
   * @param input resource(s) to be created
   * @param params additional params like custom query, queue params etc.
   * @returns
   */
  create(
    input: Partial<T> | Partial<T>[],
    params?: {
      customQuery?: string;
      queueParams?: IMutationQueueParams;
      customQueryAdditionalParams?: { [key: string]: any };
    }
  ) {
    let data;
    let action = PersistanceActionType.CREATE;
    let commonProps = {
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      createdBy: this.currentUserId,
      modifiedBy: this.currentUserId
    };
    if (Array.isArray(input)) {
      input = input?.map((r) => ({
        ...r,
        id: r.id ?? prefixTable(generateUID(), this.id),
        ...commonProps
      }));
      if (params?.customQuery) {
        data = { resources: input, ...params?.customQueryAdditionalParams };
        action = PersistanceActionType.CUSTOM_CREATE;
      } else {
        data = [...input];
        action = PersistanceActionType.INSERT;
      }
    } else {
      input = {
        ...input,
        id: input.id ?? prefixTable(generateUID(), this.id),
        ...commonProps
      };
      if (params?.customQuery) {
        data = { resource: input };
        action = PersistanceActionType.CUSTOM_CREATE;
      } else {
        data = input;
      }
    }
    return dataManager.performMutationForIFR(this.id, data, {
      action,
      query: params?.customQuery,
      queueParams: params?.queueParams
    });
  }
  async modify(
    id: string,
    resource: Partial<T>,
    mutatationQueueParams?: IMutationQueueParams
  ) {
    if (!this.currentUserId || typeof this.currentUserId != "string") {
      this.currentUserId = await resolveCurrentUserId();
    }
    const data: Partial<T> = {
      id,
      ...resource,
      modifiedBy: this.currentUserId
    };
    return dataManager.performMutationForIFR(this.id, data, {
      action: PersistanceActionType.MERGE,
      queueParams: mutatationQueueParams
    });
  }
  async trash(id: string, mutatationQueueParams?: IMutationQueueParams) {
    return dataManager.performMutationForIFR(
      this.id,
      {
        id,
        trashInformation: {
          deletedAt: new Date().toISOString(),
          deletedBy: this.currentUserId
        },
        modifiedBy: this.currentUserId,
        modifiedAt: new Date().toISOString()
      },
      {
        action: PersistanceActionType.MERGE,
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
    T extends { id: string } & {
      trashInformation?: ITrashInformation;
    },
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
  id: Resource;
  defaultFilter?: (items: T[]) => T[] | undefined;
  currentUserId?: string;
  constructor(
    item: Resource,
    defaultFilter?: (items: T[]) => T[],
    params?: Pick<IStore, "priorityRefreshOnAppAppear" | "refreshQuery">
  ) {
    super(item, StoreDataType.FIR, params);
    this.id = item;
    this.mutatingResources = [item];
    this.defaultFilter = defaultFilter;
    resolveCurrentUserId().then((x) => {
      this.currentUserId = x;
    });
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
    this._mutation(PersistanceActionType.REPLACE, item);
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
  async trash(id: string) {
    let item = this.get().items.find((x) => x.id == id);
    if (!item) return;
    item = {
      ...item,
      trashInformation: {
        deletedAt: new Date().toISOString(),
        deletedBy: this.currentUserId
      },
      modifiedBy: this.currentUserId,
      modifiedAt: new Date().toISOString()
    };
    this._mutation(PersistanceActionType.MERGE, { ...item, id });
    this.update((x: S) => {
      x.items = x.items.filter((t) => t.id != id);
      return x;
    });
    this.cache();
  }
}
