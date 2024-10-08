import { get, writable } from "svelte/store";
import {
  activeResourceFilter,
  debouncer,
  generateUID
} from "../../../utils/utils";
import {
  PersistenceActionType,
  StoreDataType,
  type IStore,
  type IMutationQueueParams,
  type IObservableStoreSubject,
  type IObservableStore,
  CacheStrategy,
  type IMutationParamsv2,
  type IResourceSelectParams,
  type IRecordId
} from "../../../types/data.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { prefixTable } from "../../../../shared/utils/text.utils";
import { dataManager } from "$lib/client/persistence/dataManager";
import { ObservableStore } from "../../../stores/client.store";
import { resolveCurrentUserId } from "../../../utils/account.utils";
import type {
  IResource,
  ITrashInformation,
  OmitForCapture,
  OmitForCaptureWithId
} from "./resource.type";
import { generateRandomId } from "$lib/shared/utils/crypto.utils";
import { flux } from "../flux";
import { isExtensionEnvironment } from "$lib/client/utils/browser.utils";
import { extensionFlux } from "../fluxExtentionMediator";
import { FluxMethod } from "../flux.type";
// import { appStore } from "$lib/client/stores/app.store";

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
  clickHandler(id: string) {
    let current = this.get();
    if (current.length > 0) {
      const isSelected = current.includes(id);
      if (isSelected) {
        current = current.filter((x) => x != id);
        this.set(current);
        return true;
      }
      this.set([...current, id]);
      return true;
    }
  }
}

// export const selectedResources = writable<string[]>([]);

export class ActiveResourceStore<
  T extends IResource,
  U extends ResourceStore<T>
> {
  id: IRecordId;
  protected subject = writable<T>();
  protected resourceStore: U;
  protected currentUserId?: string;
  subscribe = this.subject.subscribe;
  set = this.subject.set;
  update = this.subject.update;
  constructor(id: IRecordId, resourceStore: U) {
    this.id = id;
    this.resourceStore = resourceStore;
    resolveCurrentUserId().then((x) => {
      this.currentUserId = x;
    });
  }

  modify(val: Partial<T>, params?: { isPreventBackPropagation?: boolean }) {
    return this.resourceStore.modify(this.id, val, params);
  }

  debouncedModify(val: Partial<T>, key?: string) {
    return this.resourceStore.modify(this.id, val, {
      isDebounced: true,
      debounceKey: key
    });
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

  static resolve<T extends ActiveResourceStore<any, any>>(
    this: new (id: IRecordId) => T,
    id: IRecordId
  ): T {
    const idStr = id.toString();
    if (!activeResources.has(idStr)) {
      activeResources.set(idStr, new this(id));
    }
    let val = activeResources.get(idStr);
    return val! as T;
  }

  static destroy(id: IRecordId) {
    activeResources.delete(id.toString());
  }
}

/**
 * For IFR Resources
 */
export class ResourceStore<T extends IResource> implements IStore {
  id: Resource;
  dataType: StoreDataType = StoreDataType.IFR;
  currentUserId?: string;
  dboDependencies?: string[];
  isInMemory?: boolean = false;
  /**
   * Can be subscribed only if the store is inMemory. Otherwise, data will be always empty.
   */
  protected items = writable<T[]>();
  subscribe = this.items.subscribe;
  update = this.items.update;
  protected _setInMemoryItems = this.items.set;
  protected debouncers = new Map<string, any>();
  private isExtensionEnvironment: boolean = false;

  constructor(
    resourceType: Resource,
    params?: Pick<IStore, "dboDependencies" | "isInMemory">
  ) {
    this.id = resourceType;
    resolveCurrentUserId().then((x) => {
      this.currentUserId = x;
    });
    this.dboDependencies = params?.dboDependencies;
    this.isInMemory = params?.isInMemory;
    this.isExtensionEnvironment = isExtensionEnvironment();
  }

  /**
   * Creates a resource or a list of resources. If the input param is a list, it will be inserted into the database.
   * @param input resource(s) to be created
   * @param params additional params like custom query, queue params etc.
   * @returns
   */
  async create(
    input:
      | OmitForCapture<T>
      | OmitForCapture<T>[]
      | OmitForCaptureWithId<T>
      | OmitForCaptureWithId<T>[],
    params?: {
      customQuery?: string;
      queueParams?: IMutationQueueParams;
      customQueryAdditionalParams?: { [key: string]: any };
    }
  ): Promise<T[] | undefined> {
    let commonProps = {
      createdAt: new Date(),
      modifiedAt: new Date(),
      createdBy: this.currentUserId,
      modifiedBy: this.currentUserId
    };

    let data: IMutationParamsv2<T>;
    let resources: T[] = [];
    if (Array.isArray(input)) {
      resources = input?.map((r) => ({
        ...r,
        id: "id" in r && r.id ? r.id : generateRandomId(),
        ...commonProps
      }));
    } else {
      resources = [
        {
          ...input,
          id: "id" in input && input.id ? input.id : generateRandomId(),
          ...commonProps
        }
      ];
    }

    if (params?.customQuery) {
      //TODO - use $resource in query
      data = {
        action: PersistenceActionType.CUSTOM,
        query: params.customQuery,
        data: {
          resources,
          ...params?.customQueryAdditionalParams
        }
      };
    } else {
      data = { action: PersistenceActionType.INSERT, records: resources };
    }
    if (this.isExtensionEnvironment) {
      const result = await extensionFlux({
        method: FluxMethod.MUTATION,
        args: {
          resource: this.id,
          params: data
        }
      });
      if (result) return resources;
      return result;
    }
    return flux.mutation<T>(this.id, data);
  }

  private persistModification(data: Partial<T>) {
    if (this.isExtensionEnvironment) {
      return extensionFlux({
        method: FluxMethod.MUTATION,
        args: {
          resource: this.id,
          params: {
            action: PersistenceActionType.MERGE,
            record: data
          }
        }
      });
    }
    return flux.mutation<T>(this.id, {
      action: PersistenceActionType.MERGE,
      record: data
    });
  }

  private resolveDebouncerForPersist(id: string) {
    if (!this.debouncers.has(id)) {
      this.debouncers.set(
        id,
        debouncer(this.persistModification.bind(this), 2000)
      );
    }
    let val = this.debouncers.get(id);
    return val!;
  }

  /**
   * Modifies the resource with given id - with the properties passed and persists the change. If an active resource is present, it will be updated with the new properties.
   * @param id id of the resource to be updated
   * @param properties properties to be updated
   * @param mutatationQueueParams params to be passed to the mutation queue
   * @returns
   */
  async modify(
    id: IRecordId,
    properties: Partial<T>,
    additionalParams?: {
      isPreventBackPropagation?: boolean;
      isDebounced?: boolean;
      debounceKey?: string;
    }
  ) {
    if (!this.currentUserId || typeof this.currentUserId != "string") {
      this.currentUserId = await resolveCurrentUserId();
    }
    const modificationProps = {
      modifiedBy: this.currentUserId,
      modifiedAt: new Date().toISOString()
    };
    const activeResource = activeResources.get(id.toString());
    if (activeResource && !additionalParams?.isPreventBackPropagation) {
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

    if (additionalParams?.isDebounced) {
      return this.resolveDebouncerForPersist(
        additionalParams.debounceKey ?? id.toString()
      )(data);
    }
    return this.persistModification(data);
  }

  async trash(id: IRecordId) {
    return this.modify(id, {
      trashInformation: {
        deletedBy: this.currentUserId,
        deletedAt: new Date().toISOString()
      }
    } as Partial<T>);
  }

  async bulkModify(ids: IRecordId[], data: Partial<T>) {
    if (this.isExtensionEnvironment) {
      return extensionFlux({
        method: FluxMethod.MUTATION,
        args: {
          resource: this.id,
          params: {
            action: PersistenceActionType.BULK_MERGE,
            records: ids.map((id) => ({
              id,
              ...data,
              modifiedBy: this.currentUserId,
              modifiedAt: new Date().toISOString()
            }))
          }
        }
      });
    }
    return flux.mutation<T>(this.id, {
      action: PersistenceActionType.BULK_MERGE,
      records: ids.map((id) => ({
        id,
        ...data,
        modifiedBy: this.currentUserId,
        modifiedAt: new Date().toISOString()
      }))
    });
  }
  async bulkTrash(ids: IRecordId[]) {
    return this.bulkModify(ids, {
      trashInformation: {
        deletedBy: this.currentUserId,
        deletedAt: new Date().toISOString()
      }
    } as Partial<T>);
  }
  archive(id: IRecordId) {
    return this.modify(id, {
      isArchived: true
    } as Partial<T>);
  }
  unarchive(id: IRecordId) {
    return this.modify(id, {
      isArchived: false
    } as Partial<T>);
  }
  restore(id: IRecordId) {
    return this.modify(id, {
      trashInformation: undefined
    } as Partial<T>);
  }

  get() {}

  selectMany(params?: IResourceSelectParams) {
    if (this.isExtensionEnvironment) {
      return extensionFlux({
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: this.id,
          params
        }
      });
    }
    return flux.selectMany(this.id, params);
  }

  select(resourceId: IRecordId, properties?: string[]) {
    if (this.isExtensionEnvironment) {
      return extensionFlux({
        method: FluxMethod.SELECT,
        args: {
          resourceId,
          properties
        }
      });
    }
    return flux.select(resourceId, properties);
  }

  /**
   * This gets triggered from flux to load or reload items if the store is set to inMemory
   * @param data
   * @returns
   */
  loader(data: T[]) {
    if (!this.isInMemory) return;
    this._setInMemoryItems(data);
  }
}

/**
 * @deprecated - use ResourceStore with inMemory set to true
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
  private async _mutation(action: PersistenceActionType, record: string | T) {
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
    this._mutation(PersistenceActionType.CREATE, newItem);
    this.update((x: S) => {
      x.items.push(newItem);
      return x;
    });
    this.cache();
    return true;
  }
  async modify(item: Partial<T>) {
    this.update((x: S) => {
      const current = x.items.find((x) => x.id == item.id);
      x.items = x.items.filter((t) => t.id != item.id);
      x.items.push({ ...current, ...item } as T);
      return x;
    });
    this.cache();
    return this._mutation(PersistenceActionType.MERGE, item as T);
  }
  async delete(id: string) {
    const item = {
      id,
      trashInformation: {
        deletedAt: new Date().toISOString(),
        deletedBy: this.currentUserId
      }
    };
    const result = await this._mutation(PersistanceActionType.MERGE, item as T);
    // console.log("delete result", result, id);
    this.update((x: S) => {
      x.items = x.items.filter((t) => t.id != id);
      x.filtered = this.defaultFilter ? this.defaultFilter(x.items) : x.items;
      return x;
    });
    this.cache();
    return result;
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
    this._mutation(PersistenceActionType.MERGE, { ...item, id });
    this.update((x: S) => {
      x.items = x.items.filter((t) => t.id != id);
      return x;
    });
    this.cache();
  }
}
