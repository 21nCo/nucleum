import { get, writable } from "svelte/store";
import {
  activeResourceFilter,
  activeResourceFilterIgnoreParentInactive,
  activeResourceFilterV2,
  archivedResourceFilter,
  debouncer
} from "@21n/utils/utils";
import {
  PersistenceActionType,
  StoreDataType,
  type IStore,
  type IMutationParamsv2,
  type IResourceSelectParams,
  type IRecordId,
  type IResourceSelectAdditionalParams,
  type IResourceSelectFilters,
  type IResourceSelectProperties,
  type IResourceStore
} from "@21n/types/data.type";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { ObservableStore } from "@21n/stores/client.store";
import { resolveCurrentUserId } from "@21n/utils/account.utils";
import {
  type IMultiSelectContext,
  type IMultiSelectStore,
  type IResource,
  type IResourceMutationParams,
  type IResourceCaptureV2,
  AccessMode
} from "@21n/components/flux/resourceStores/resource.type";
import { flux } from "@21n/components/flux/flux";
import {
  dispatchCustomEvent,
  isExtensionEnvironment
} from "@21n/utils/browser.utils";
import { extensionFlux } from "@21n/components/flux/fluxExtentionMediator";
import { FluxMethod } from "@21n/components/flux/flux.type";
import { generateResourceId } from "@21n/components/flux/flux.utils";
import { toasts } from "@21n/stores/notification.store";
import { logger } from "@21n/components/debug/logger.client";
import { determineResourceAccessMode } from "@21n/components/flux/resourceStores/resource.utils";
import { GlobalEvent } from "@21n/types/event.enum";
import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
const activeResources = new Map<string, ActiveResourceStore<any, any, any>>();
export const resourceStores = new Map<Resource, ResourceStore<any, any>>();

// export const selectedResources = writable<string[]>([]);

export class ActiveResourceStore<
  T extends IResource,
  U extends ResourceStore<T, IResourceCaptureV2<T>>,
  V extends IResource
> {
  id: IRecordId;
  protected subject = writable<V>();
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
   *
   * Note: Disabling url search param due to circular loop issue on back click on mobile devices
   *
   * @param val
   * @returns
   */
  toggleEditMode(val: boolean) {
    // dispatchCustomEvent(
    //   GlobalEvent.TOGGLE_SEARCH_PARAM,
    //   val ? { [AppSearchParam.EDIT]: true } : [AppSearchParam.EDIT]
    // );
    return this.update((prev) => ({ ...prev, isInEditMode: val }));
  }
  toggleLock(val: boolean) {
    return this.resourceStore.toggleLock(this.id, val);
  }
  get() {
    return get(this.subject);
  }

  resolveExportContent(): string {
    const current = this.get();
    if (
      current &&
      typeof current === "object" &&
      "content" in current &&
      typeof current.content === "string"
    ) {
      return current.content;
    }
    return "";
  }

  static resolve<T extends ActiveResourceStore<any, any, any>>(
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

  static destroy(id: IRecordId, accessMode?: AccessMode) {
    if (accessMode === AccessMode.FULL) {
      const _accessMode = determineResourceAccessMode(id);
      if (_accessMode !== AccessMode.FULL) {
        const resource = activeResources.get(id.toString());
        if (resource) {
          resource.update((prev) => ({
            ...prev,
            accessMode: _accessMode
          }));
        }
        return;
      }
    }
    activeResources.delete(id.toString());
  }
}

/**
 * For IFR & FIR resources
 */
export class ResourceStore<T extends IResource, C extends IResourceCaptureV2<T>>
  implements IResourceStore<T>
{
  id: Resource;
  dataType: StoreDataType = StoreDataType.IFR;
  currentUserId?: string;
  defaultProps?: Partial<T> = {};
  expandProps?: string[];
  /**
   * Can be subscribed only if the store is inMemory. Otherwise, data will be always empty.
   */
  protected items = writable<T[]>();
  protected _setInMemoryItems = this.items.set;
  subscribe = this.items.subscribe;
  update = this.items.update;
  set = (data: T[]) => {
    this._setInMemoryItems(data);
  };
  protected debouncers = new Map<string, any>();
  private isExtensionEnvironment: boolean = false;
  constructor(
    resourceType: Resource,
    params?: Pick<IResourceStore<T>, "defaultProps" | "expandProps"> &
      Partial<Pick<IResourceStore<T>, "dataType">>
  ) {
    this.id = resourceType;
    resolveCurrentUserId().then((x) => {
      this.currentUserId = x;
    });
    this.dataType = params?.dataType ?? StoreDataType.IFR;
    this.defaultProps = params?.defaultProps ?? {};
    this.expandProps = params?.expandProps;
    this.isExtensionEnvironment = isExtensionEnvironment();
  }

  /**
   * Creates a resource or a list of resources. If the input param is a list, it will be inserted into the database.
   * @param input resource(s) to be created
   * @param params additional params like custom query, queue params etc.
   * @returns
   */
  async create(
    input: C | C[],
    params?: {
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
      resources = input.map((r) => ({
        ...this.defaultProps,
        ...r,
        id: "id" in r && r.id ? r.id : generateResourceId(this.id),
        ...commonProps
      })) as unknown as T[];
    } else {
      resources = [
        {
          ...this.defaultProps,
          ...input,
          id:
            "id" in input && input.id ? input.id : generateResourceId(this.id),
          ...commonProps
        }
      ] as unknown as T[];
    }
    data = { action: PersistenceActionType.INSERT, records: resources };
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
    await flux.mutation<T>(this.id, data, {
      context: params?.context
    });
    return resources;
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
          additionalParams
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
        ...additionalParams
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
    if (
      !additionalParams?.isModifyAsSystem &&
      (!this.currentUserId || typeof this.currentUserId != "string")
    ) {
      this.currentUserId = await resolveCurrentUserId();
    }
    const modificationProps = additionalParams?.isModifyAsSystem
      ? {}
      : {
          modifiedBy: this.currentUserId,
          modifiedAt: new Date()
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
   * @deprecated - use modify instead with isModifyAsSystem: true in additionalParams
   *
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
            deletedAt: new Date()
          }
        } as unknown as Partial<T>,
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
            recordIds: ids,
            changes: {
              ...data,
              modifiedBy: this.currentUserId
            },
            records: ids.map((id) => ({
              id,
              ...data,
              modifiedBy: this.currentUserId,
              modifiedAt: new Date()
            }))
          }
        }
      });
    }
    return flux.mutation<T>(
      this.id,
      {
        action: PersistenceActionType.BULK_MERGE,
        recordIds: ids,
        changes: {
          ...data,
          modifiedBy: this.currentUserId,
          modifiedAt: new Date()
        },
        records: ids.map((id) => ({
          id,
          ...data,
          modifiedBy: this.currentUserId,
          modifiedAt: new Date()
        })) as unknown as T[]
      },
      {
        ...additionalParams
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
          deletedAt: new Date()
        }
      } as unknown as Partial<T>,
      additionalParams
    );
  }

  archive(id: IRecordId, additionalParams?: IResourceMutationParams) {
    return Promise.all([
      this.modify(
        id,
        {
          isArchived: true
        } as unknown as Partial<T>,
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
        } as unknown as Partial<T>,
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
    return this.modify(
      id,
      { isLocked } as unknown as Partial<T>,
      additionalParams
    );
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
        ...additionalParams
      }
    );
  }

  deleteMany(ids: IRecordId[], additionalParams?: IResourceMutationParams) {
    if (this.isExtensionEnvironment) {
      return extensionFlux({
        method: FluxMethod.MUTATION,
        args: {
          resource: this.id,
          params: { action: PersistenceActionType.BULK_DELETE, recordIds: ids }
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
        ...additionalParams
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
    const expansionProps =
      params?.properties?.expand && params.properties.expand.length > 0
        ? params.properties.expand
        : additionalParams?.isExpand
          ? this.expandProps
          : [];
    const properties = [...(params?.properties?.select ?? [])];

    let filters: IResourceSelectFilters;
    if (params?.limit) {
      filters = {
        ...activeResourceFilterV2,
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
      filters,
      properties: {
        select: properties,
        expand: expansionProps
      }
    };
    if (this.isExtensionEnvironment) {
      return extensionFlux({
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: this.id,
          params,
          signal: additionalParams?.signal
        }
      });
    }

    const result = await flux.selectMany(this.id, params, {
      isUseCloud: additionalParams?.isUseCloud,
      signal: additionalParams?.signal
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

  /**
   * TODO - expand props usage in .select() - ex: Task.svelte
   * @param resourceId
   * @param properties
   * @param params
   * @returns
   */
  select(
    resourceId: IRecordId,
    properties?: IResourceSelectProperties,
    params?: {
      signal?: AbortSignal;
    }
  ) {
    if (this.isExtensionEnvironment) {
      return extensionFlux({
        method: FluxMethod.SELECT,
        args: {
          resourceId,
          properties,
          signal: params?.signal
        }
      });
    }
    return flux.select(resourceId, properties, {
      signal: params?.signal
    });
  }

  /**
   * This gets triggered from flux to load or reload items if the store is set to inMemory
   * @param data
   * @returns
   */
  loader(data: T[]) {
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

  static resolve<T extends ResourceStore<any, any>>(
    this: new () => T,
    resource: Resource
  ): T {
    if (!resourceStores.has(resource)) {
      resourceStores.set(resource, new this());
    }
    let val = resourceStores.get(resource);
    return val! as T;
  }
}
