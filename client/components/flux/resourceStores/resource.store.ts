import { get, writable } from "svelte/store";
import {
  activeResourceFilter,
  activeResourceFilterIgnoreParentInactive,
  archivedResourceFilter,
  debouncer
} from "../../../utils/utils";
import {
  PersistenceActionType,
  StoreDataType,
  type IStore,
  type IMutationParamsv2,
  type IResourceSelectParams,
  type IRecordId,
  type IResourceSelectAdditionalParams,
  type IResourceSelectFilters
} from "../../../types/data.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ObservableStore } from "../../../stores/client.store";
import { resolveCurrentUserId } from "../../../utils/account.utils";
import type {
  IMultiSelectContext,
  IMultiSelectStore,
  IResource,
  IResourceMutationParams,
  OmitForCapture,
  OmitForCaptureWithId
} from "./resource.type";
import { flux } from "../flux";
import {
  dispatchCustomEvent,
  isExtensionEnvironment
} from "$lib/client/utils/browser.utils";
import { extensionFlux } from "../fluxExtentionMediator";
import { FluxMethod } from "../flux.type";
import { generateResourceId } from "../flux.utils";
import { toasts } from "$lib/client/stores/notification.store";
import { logger } from "../../debug/logger.client";
import { isSameResource, resourceInList } from "./resource.utils";
import { GlobalEvent } from "$lib/client/types/event.enum";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { AppSearchParam } from "$lib/client/types/appStore.type";

export const activeResources = new Map<string, ActiveResourceStore<any, any>>();

const multiSelectStores = new Map<string, MultiSelectStore>();

export function resolveMultiSelectStore(context: IMultiSelectContext) {
  const contextStr = JSON.stringify(context);
  if (!multiSelectStores.has(contextStr))
    multiSelectStores.set(contextStr, new MultiSelectStore(context));
  return multiSelectStores.get(contextStr)!;
}

export class MultiSelectStore
  extends ObservableStore<IRecordId[]>
  implements IMultiSelectStore
{
  context: IMultiSelectContext;
  constructor(context: IMultiSelectContext) {
    super(JSON.stringify(context), StoreDataType.NA);
    this.context = context;
    this.set([]);
  }

  reset() {
    this.set([]);
  }

  clickHandler(id: IRecordId) {
    let current = this.get();
    if (current.length > 0) {
      const isSelected = current.some(resourceInList(id));
      if (isSelected) {
        current = current.filter((x) => !isSameResource(x, id));
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

  /**
   * @deprecated - use debouncer at source
   * @param val
   * @param key
   * @returns
   */
  debouncedModify(val: Partial<T>, key?: string) {
    return this.resourceStore.modify(this.id, val, {
      isDebounced: true,
      debounceKey: key
    });
  }

  delete() {
    return this.resourceStore.trash(this.id);
  }
  deletePermanently() {
    return this.resourceStore.delete(this.id);
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
  toggleReadMode(val: boolean) {
    return this.update((prev) => ({ ...prev, isInReadOnlyMode: val }));
  }
  /**
   * Removed dependency on appStore to avoid circular dependency issues on Clipper extension.
   * @param val
   * @returns
   */
  toggleEditMode(val: boolean) {
    dispatchCustomEvent(
      GlobalEvent.TOGGLE_SEARCH_PARAM,
      val ? { [AppSearchParam.EDIT]: true } : [AppSearchParam.EDIT]
    );
    return this.update((prev) => ({ ...prev, isInEditMode: val }));
  }
  toggleLock(val: boolean) {
    return this.resourceStore.toggleLock(this.id, val);
  }
  get() {
    return get(this.subject);
  }

  resolveExportContent(): string {
    return (this.get().content as string) ?? "";
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
  isCloudOnlyResource?: boolean = false;
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
    params?: Pick<
      IStore,
      "dboDependencies" | "isInMemory" | "isCloudOnlyResource"
    > &
      Partial<Pick<IStore, "dataType">>
  ) {
    this.id = resourceType;
    resolveCurrentUserId().then((x) => {
      this.currentUserId = x;
    });
    this.dboDependencies = params?.dboDependencies;
    this.isInMemory = params?.isInMemory;
    this.isCloudOnlyResource = params?.isCloudOnlyResource;
    this.dataType = params?.dataType ?? StoreDataType.IFR;
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
      customQueryAdditionalParams?: { [key: string]: any };
      context?: string;
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
        id: "id" in r && r.id ? r.id : generateResourceId(this.id),
        ...commonProps
      }));
    } else {
      resources = [
        {
          ...input,
          id:
            "id" in input && input.id ? input.id : generateResourceId(this.id),
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
          params: data,
          additionalParams: {
            isCloudOnlyResource: this.isCloudOnlyResource
          }
        }
      });
      if (result) return resources;
      return result;
    }
    return flux.mutation<T>(this.id, data, {
      isCloudOnlyResource: this.isCloudOnlyResource,
      context: params?.context
    });
  }

  private persistModification(
    data: Partial<T>,
    additionalParams?: IResourceMutationParams
  ) {
    if (this.isExtensionEnvironment) {
      return extensionFlux({
        method: FluxMethod.MUTATION,
        args: {
          resource: this.id,
          params: {
            action: PersistenceActionType.MERGE,
            record: data
          },
          additionalParams: {
            ...additionalParams,
            isCloudOnlyResource: this.isCloudOnlyResource
          }
        }
      });
    }
    return flux.mutation<T>(
      this.id,
      {
        action: PersistenceActionType.MERGE,
        record: data
      },
      {
        ...additionalParams,
        isCloudOnlyResource: this.isCloudOnlyResource
      }
    );
  }

  private resolveDebouncerForPersist(id: string) {
    if (!this.debouncers.has(id)) {
      this.debouncers.set(
        id,
        debouncer(this.persistModification.bind(this), 1500)
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
    additionalParams?: IResourceMutationParams
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
    return this.persistModification(data, additionalParams);
  }

  /**
   * Modifies the resource with given id as a system i.e. modifiedBy and modifiedAt are not set - with the properties passed and persists the change. If an active resource is present, it will be updated with the new properties.
   * @param id id of the resource to be updated
   * @param properties properties to be updated
   * @param mutatationQueueParams params to be passed to the mutation queue
   * @returns
   */
  async modifyAsSystem(
    id: IRecordId,
    properties: Partial<T>,
    additionalParams?: IResourceMutationParams
  ) {
    const activeResource = activeResources.get(id.toString());
    if (activeResource && !additionalParams?.isPreventBackPropagation) {
      activeResource.update((prev: T) => ({
        ...prev,
        ...properties
      }));
    }
    const data: Partial<T> = {
      id,
      ...properties
    };

    if (additionalParams?.isDebounced) {
      return this.resolveDebouncerForPersist(
        additionalParams.debounceKey ?? id.toString()
      )(data);
    }
    return this.persistModification(data, additionalParams);
  }

  async trash(id: IRecordId, additionalParams?: IResourceMutationParams) {
    return Promise.all([
      this.modify(
        id,
        {
          trashInformation: {
            deletedBy: this.currentUserId,
            deletedAt: new Date().toISOString()
          }
        } as Partial<T>,
        additionalParams
      ),
      this.onTrash([id])
    ]);
  }

  async bulkModify(
    ids: IRecordId[],
    data: Partial<T>,
    additionalParams?: IResourceMutationParams
  ) {
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
          },
          additionalParams: {
            isCloudOnlyResource: this.isCloudOnlyResource
          }
        }
      });
    }
    return flux.mutation<T>(
      this.id,
      {
        action: PersistenceActionType.BULK_MERGE,
        records: ids.map((id) => ({
          id,
          ...data,
          modifiedBy: this.currentUserId,
          modifiedAt: new Date().toISOString()
        }))
      },
      {
        ...additionalParams,
        isCloudOnlyResource: this.isCloudOnlyResource
      }
    );
  }

  async bulkTrash(
    ids: IRecordId[],
    additionalParams?: IResourceMutationParams
  ) {
    return this.bulkModify(
      ids,
      {
        trashInformation: {
          deletedBy: this.currentUserId,
          deletedAt: new Date().toISOString()
        }
      } as Partial<T>,
      additionalParams
    );
  }

  archive(id: IRecordId, additionalParams?: IResourceMutationParams) {
    return Promise.all([
      this.modify(
        id,
        {
          isArchived: true
        } as Partial<T>,
        additionalParams
      ),
      this.onArchive([id])
    ]);
  }

  unarchive(id: IRecordId, additionalParams?: IResourceMutationParams) {
    return Promise.all([
      this.modify(
        id,
        {
          isArchived: false
        } as Partial<T>,
        additionalParams
      ),
      this.onUnarchive([id])
    ]);
  }

  restore(id: IRecordId, additionalParams?: IResourceMutationParams) {
    return Promise.all([
      this.modify(
        id,
        {
          trashInformation: undefined
        } as Partial<T>,
        additionalParams
      ),
      this.onRestore([id])
    ]);
  }

  onArchive(ids: IRecordId[]) {
    //will be implemented by derived stores to handle sub items archive
  }

  onUnarchive(ids: IRecordId[]) {
    //will be implemented by derived stores to handle sub items unarchive
  }

  onTrash(ids: IRecordId[]) {
    //will be implemented by derived stores to handle sub items trash
  }

  onRestore(ids: IRecordId[]) {
    //will be implemented by derived stores to handle sub items restore
  }

  toggleLock(
    id: IRecordId,
    isLocked: boolean,
    additionalParams?: IResourceMutationParams
  ) {
    return this.modify(id, { isLocked } as Partial<T>, additionalParams);
  }

  /**
   * Delete the resource permanently.
   * @param id
   * @returns
   */
  delete(id: IRecordId, additionalParams?: IResourceMutationParams) {
    if (this.isExtensionEnvironment) {
      return extensionFlux({
        method: FluxMethod.MUTATION,
        args: {
          resource: this.id,
          params: {
            action: PersistenceActionType.DELETE,
            recordId: id
          },
          additionalParams: {
            isCloudOnlyResource: this.isCloudOnlyResource
          }
        }
      });
    }
    return flux.mutation(
      this.id,
      {
        action: PersistenceActionType.DELETE,
        recordId: id
      },
      {
        ...additionalParams,
        isCloudOnlyResource: this.isCloudOnlyResource
      }
    );
  }

  deleteMany(ids: IRecordId[], additionalParams?: IResourceMutationParams) {
    if (this.isExtensionEnvironment) {
      return extensionFlux({
        method: FluxMethod.MUTATION,
        args: {
          resource: this.id,
          params: { action: PersistenceActionType.BULK_DELETE, recordIds: ids },
          additionalParams: {
            isCloudOnlyResource: this.isCloudOnlyResource
          }
        }
      });
    }
    return flux.mutation(
      this.id,
      {
        action: PersistenceActionType.BULK_DELETE,
        recordIds: ids
      },
      {
        ...additionalParams,
        isCloudOnlyResource: this.isCloudOnlyResource
      }
    );
  }

  get() {}

  /**
   *
   * Post filters for active resource is applied if limit is not set. This is to improve query performance for large datasets. Use post filters when limit or offset is present is causing pagination count issues.
   *
   * @param params
   * @param additionalParams
   * @returns
   */
  async selectMany(
    params?: IResourceSelectParams,
    additionalParams?: IResourceSelectAdditionalParams
  ) {
    let filters: IResourceSelectFilters;
    if (params?.limit) {
      filters = {
        trashInformation: false,
        ...(params?.filters ?? {}),
        isArchived: params?.filters?.isArchived ?? false
      };
    } else {
      filters = {
        ...(params?.filters ?? {}),
        isArchived: params?.filters?.isArchived ?? undefined
      };
    }
    params = {
      ...params,
      filters
    };
    if (this.isExtensionEnvironment) {
      return extensionFlux({
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: this.id,
          params
        }
      });
    }

    const result = await flux.selectMany(this.id, params, {
      isCloudOnlyResource:
        this.isCloudOnlyResource ?? additionalParams?.isUseCloud
    });
    if (
      !result ||
      !isValidArrayWithData(result) ||
      additionalParams?.isIncludeInactiveItems ||
      params?.limit
    )
      return result;
    else if (params?.filters?.isArchived)
      return result.filter(archivedResourceFilter);
    else if (additionalParams?.isIgnoreParentInactive)
      return result.filter(activeResourceFilterIgnoreParentInactive);
    else return result.filter(activeResourceFilter);
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
    return flux.select(resourceId, properties, {
      isCloudOnlyResource: this.isCloudOnlyResource
    });
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

  toggleEditMode(id: IRecordId, isInEditMode: boolean) {
    const activeResource = activeResources.get(id.toString());
    if (!activeResource) return;
    activeResource.update((prev: T) => ({
      ...prev,
      isInEditMode
    }));
  }

  toggleReadMode(id: IRecordId, isInReadOnlyMode: boolean) {
    const activeResource = activeResources.get(id.toString());
    if (!activeResource) return;
    activeResource.update((prev: T) => ({
      ...prev,
      isInReadOnlyMode
    }));
  }

  toggleFocusMode(id: IRecordId, isInFocusMode: boolean) {
    const activeResource = activeResources.get(id.toString());
    if (!activeResource) return;
    activeResource.update((prev: T) => ({
      ...prev,
      isInFocusMode
    }));
    dispatchCustomEvent(GlobalEvent.FOCUS_MODE, isInFocusMode);
  }

  copyContents(id: IRecordId) {
    const activeResource = activeResources.get(id.toString());
    if (!activeResource) return;
    const content = activeResource.resolveExportContent();
    logger.log({ at: "ResourceStore.copyContents", content, activeResource });
    if (content) {
      navigator.clipboard.writeText(content);
    } else {
      toasts.error("Something went wrong. Please try again.");
    }
  }
}
