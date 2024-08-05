import { get, writable } from "svelte/store";
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
  type IObservableStore,
  CacheStrategy
} from "../../types/data.type";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { prefixTable } from "../../../shared/utils/text.utils";
import { dataManager } from "../../persistence/dataManager";
import { ObservableStore } from "../../stores/client.store";
import { resolveCurrentUserId } from "../../utils/account.utils";
import type {
  IResource,
  ITrashInformation,
  ResourceAccessMode
} from "./resource.type";
import { appStore } from "$lib/client/stores/app.store";

export const activeResources = new Map<string, ActiveResourceStore<any, any>>();

const multiSelectStores = new Map<string, MultiSelectStore>();

export function resolveMultiSelectStore(context: string) {
  if (!multiSelectStores.has(context))
    multiSelectStores.set(context, new MultiSelectStore(context));
  return multiSelectStores.get(context)!;
}

class MultiSelectStore extends ObservableStore<string[]> {
  constructor(context: string) {
    super(context, StoreDataType.NA);
    this.set([]);
  }
  clickHandler(
    e: MouseEvent,
    id: string,
    params?: {
      accessMode?: ResourceAccessMode;
    }
  ) {
    let current = this.get();
    if (current.length > 0) {
      const isSelected = current.includes(id);
      if (isSelected) {
        current = current.filter((x) => x != id);
        this.set(current);
        return;
      }
      this.set([...current, id]);
      return;
    }
    if (params?.accessMode)
      appStore.resourceClickHandler(e, id, params.accessMode);
  }
}

// export const selectedResources = writable<string[]>([]);

export class ActiveResourceStore<
  T extends IResource,
  U extends ResourceStore<T>
> {
  id: string;
  protected subject = writable<T>();
  protected debouncedPersist: any;
  protected resourceStore: U;
  protected currentUserId?: string;
  subscribe = this.subject.subscribe;
  set = this.subject.set;
  update = this.subject.update;
  constructor(id: string, resourceStore: U) {
    this.id = id;
    this.resourceStore = resourceStore;
    resolveCurrentUserId().then((x) => {
      this.currentUserId = x;
    });
    const updatePropagator = (val: Partial<T>) =>
      this.resourceStore.modify(this.id, val);
    this.debouncedPersist = debouncer(updatePropagator, 2000);
  }
  modify(val: Partial<T>, params?: IMutationQueueParams) {
    return this.resourceStore.modify(this.id, val, params);
  }
  debouncedModify(val: Partial<T>) {
    this.update((prev: T) => ({ ...prev, ...val }));
    return this.debouncedPersist(val);
  }
  /**
   * @deprecated - use {@link debouncedModify} instead
   */
  propagateTitleChange(label: string) {
    return this.debouncedPersist({ label });
  }
  delete() {
    return this.resourceStore.trash(this.id);
  }
  archive() {
    return this.resourceStore.archive(this.id);
  }
  unarchive() {
    return this.resourceStore.unarchive(this.id);
  }
  restore() {
    return this.resourceStore.restore(this.id);
  }
  get() {
    return get(this.subject);
  }
}

/**
 * For IFR Resources
 */
export class ResourceStore<T extends IResource> implements IStore {
  id: Resource;
  dataType: StoreDataType = StoreDataType.IFR;
  refreshOnAppear: boolean = false;
  refreshQuery?: string;
  currentUserId?: string;
  mutatingResources: string[];
  cacheStrategy?: CacheStrategy;
  dboDependencies?: string[];
  constructor(
    resourceType: Resource,
    params?: Pick<
      IStore,
      "refreshOnAppear" | "refreshQuery" | "cacheStrategy" | "dboDependencies"
    >
  ) {
    this.id = resourceType;
    resolveCurrentUserId().then((x) => {
      this.currentUserId = x;
    });
    this.mutatingResources = [resourceType];
    this.refreshOnAppear = params?.refreshOnAppear || false;
    this.refreshQuery = params?.refreshQuery;
    this.cacheStrategy = params?.cacheStrategy ?? CacheStrategy.MERGE_RECORDS;
    this.dboDependencies = params?.dboDependencies;
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
      interactedAt: new Date().toISOString(),
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
      } else {
        data = input;
      }
    }
    return dataManager.performMutationForIFR(this.id, data, {
      action,
      query: params?.customQuery,
      queueParams: params?.queueParams,
      cacheStrategy: this.cacheStrategy
    });
  }
  /**
   * Modifies the resource with given id - with the properties passed and persists the change. If an active resource is present, it will be updated with the new properties.
   * @param id id of the resource to be updated
   * @param properties properties to be updated
   * @param mutatationQueueParams params to be passed to the mutation queue
   * @returns
   */
  async modify(
    id: string,
    properties: Partial<T>,
    mutatationQueueParams?: IMutationQueueParams
  ) {
    if (!this.currentUserId || typeof this.currentUserId != "string") {
      this.currentUserId = await resolveCurrentUserId();
    }
    const modificationProps = {
      modifiedBy: this.currentUserId,
      modifiedAt: new Date().toISOString(),
      interactedAt: new Date().toISOString()
    };
    const activeResource = activeResources.get(id);
    if (activeResource) {
      activeResource.update((prev: T) => ({
        ...prev,
        ...properties,
        ...modificationProps
      }));
    }
    const data: Partial<T> = {
      id,
      ...properties,
      ...modificationProps
    };
    return dataManager.performMutationForIFR(this.id, data, {
      action: PersistanceActionType.MERGE,
      queueParams: mutatationQueueParams,
      cacheStrategy: this.cacheStrategy
    });
  }
  async trash(id: string) {
    return this.modify(id, {
      trashInformation: {
        deletedBy: this.currentUserId,
        deletedAt: new Date().toISOString()
      }
    } as Partial<T>);
  }
  async bulkModify(ids: string[], data: Partial<T>) {
    return dataManager.performMutationForIFR(
      this.id,
      {
        ids,
        data: {
          ...data,
          modifiedBy: this.currentUserId,
          modifiedAt: new Date().toISOString(),
          interactedAt: new Date().toISOString()
        }
      } as any,
      {
        action: PersistanceActionType.BULK_MERGE,
        cacheStrategy: this.cacheStrategy
      }
    );
  }
  async bulkTrash(ids: string[]) {
    return this.bulkModify(ids, {
      trashInformation: {
        deletedBy: this.currentUserId,
        deletedAt: new Date().toISOString()
      }
    } as Partial<T>);
  }
  archive(id: string) {
    return this.modify(id, {
      isArchived: true
    } as Partial<T>);
  }
  unarchive(id: string) {
    return this.modify(id, {
      isArchived: false
    } as Partial<T>);
  }
  restore(id: string) {
    return this.modify(id, {
      trashInformation: undefined
    } as Partial<T>);
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
    params?: Pick<
      IStore,
      "refreshOnAppear" | "refreshQuery" | "dboDependencies"
    >
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
      modifiedAt: new Date().toISOString(),
      interactedAt: new Date().toISOString()
    };
    this._mutation(PersistanceActionType.MERGE, { ...item, id });
    this.update((x: S) => {
      x.items = x.items.filter((t) => t.id != id);
      return x;
    });
    this.cache();
  }
}
