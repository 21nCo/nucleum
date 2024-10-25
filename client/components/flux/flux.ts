import { logger } from "$lib/client/components/debug/logger.client";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  ResourceActionType,
  type IResource
} from "$lib/client/components/flux/resourceStores/resource.type";
import {
  type IStore,
  PersistenceActionType,
  type IMutationParamsv2,
  StoreDataType,
  type IObservableStore,
  type IResourceSelectParams,
  type IRecordId,
  type IMutation,
  type IInsertMutation
} from "$lib/client/types/data.type";
import {
  detectTimeZone,
  detectTimeZoneFallback
} from "$lib/client/utils/time.utils";
import {
  ClientStorageKey,
  type ILocal,
  type IPersistence,
  type ISyncHandler,
  PersistenceProvider
} from "$lib/client/persistence/persistence.type";
import {
  dispatchCustomEvent,
  isExtensionEnvironment
} from "$lib/client/utils/browser.utils";
import { clientStorage } from "$lib/client/persistence/persistence.utils";
import { SurrealSync } from "$lib/client/persistence/surreal/surreal.sync";
import { generateRandomId } from "$lib/shared/utils/crypto.utils";
import type { ISurrealDatabase } from "$lib/client/types/db.type";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";

import { resolveCurrentUserId } from "$lib/client/utils/account.utils";
import { GlobalEvent } from "$lib/client/types/event.enum";
import { determineIfOffline } from "$lib/client/utils/network.utils";
import { ExtensionEvent } from "$lib/client/types/extension.type";
import { relayToContentScript, relayToSidePanel } from "$lib/client/utils/extension.utils";

class Flux {
  static _instance: Flux | null = null;
  stores: IStore[] = [];
  provider!: PersistenceProvider;
  persistence!: IPersistence;
  syncer!: ISyncHandler;
  remote!: ISurrealDatabase;
  private isLocalMode: boolean = false;
  private isExtensionEnvironment: boolean = false;
  private isSyncDownPending: boolean = false;
  private constructor() {
    this.isExtensionEnvironment = isExtensionEnvironment();
  }

  static initialize(
    stores: IStore[],
    provider: PersistenceProvider,
    persistence: IPersistence,
    params: {
      dapId: string;
      userId?: string;
      appVersion?: string;
    }
  ): Promise<number> {
    logger.log({ at: "flux.initialize", stores, params });
    Flux._instance = new Flux();
    Flux._instance.provider = provider;
    Flux._instance.isLocalMode = !params.userId;
    Flux._instance.persistence = persistence;
    Flux._instance.stores = stores;
    switch (provider) {
      case PersistenceProvider.SURREAL_SURREAL:
      case PersistenceProvider.DEXIE_SURREAL:
        Flux._instance.remote = new SurrealDatabase();
        Flux._instance.syncer = new SurrealSync(Flux._instance.remote);
        break;
      default:
        break;
    }
    logger.log({ at: "flux.initialized", instance: Flux._instance });
    return Flux._instance.initializePersistence(params);
  }

  /**
   * @param stores
   * @param userId
   * @param params
   */
  private initializePersistence(params: {
    dapId: string;
    userId?: string;
    appVersion?: string;
  }) {
    logger.log({ at: "flux.initializePersistence", params });
    const dboDependencies = new Set(
      this.stores
        .map((x) => x.dboDependencies)
        .filter((x) => x !== undefined)
        .flat()
    );
    const dbo = [...dboDependencies];
    return this.persistence.initialize({
      ...params,
      dbo
    });
  }

  async loadInMemoryStores() {
    logger.log({ at: "flux.loadInMemoryStores" });
    try {
      let kvStores = this.stores.filter(
        (x) => x.dataType === StoreDataType.KVO
      );
      const data = await this.persistence.selectMany(Resource.kv);
      if (!data) return;
      data.forEach((record: any) => {
        const store = kvStores.find(
          (x) => "kv:" + x.id === record.id.toString()
        );
        if (!store?.loader) return;
        store.loader(record);
      });
      let inMemoryResouceStores = this.stores.filter((x) => x.isInMemory);
      if (!inMemoryResouceStores) return;
      for (const store of inMemoryResouceStores) {
        const data = await this.persistence.selectMany(store.id as Resource);
        if (data && Array.isArray(data) && store?.loader) {
          logger.log({
            at: "flux.loadInMemoryStores - loading resource store",
            id: store.id,
            data
          });
          store.loader(data);
        }
      }
    } catch (e) {
      logger.error({ at: "flux.loadInMemoryStores", error: e });
    }
  }

  private async loadInMemoryResourceStore(resource: Resource) {
    logger.log({ at: "flux.loadInMemoryResourceStore", resource });
    const store = this.stores.find((x) => x.id === resource);
    if (store?.loader) {
      const data = await this.persistence.selectMany(resource);
      store.loader(data);
    }
  }

  /**
   * This method will be called on signup and database is bootstrapped.
   * This will persist all kv seed data on cloud.
   */
  async kvSeed() {
    logger.log({ at: "flux.kvSeed" });
    try {
      let data = this.stores
        .filter((x) => x.dataType === StoreDataType.KVO)
        .map((x) => {
          const k = x as IObservableStore<any>;
          return { id: k.id, ...k.seed };
        });
      data = [...data, { id: "mutationMap" }];
      await this.seed();
      const params: IInsertMutation<any> = {
        records: data,
        action: PersistenceActionType.INSERT
      };
      const result = await this.persistence.mutation(Resource.kv, params);
      if (!this.isLocalMode) {
        await this.insertMutation(Resource.kv, params);
      }
      return result;
    } catch (e) {
      logger.error({ at: "flux.kvSeed", error: e });
    }
  }

  /**
   * Adds a timezone record to the database on signup with 1970 as lowest to enable adding manual logs in the past or importing data from the past.
   *
   * Note: Any manual logs or imports prior to 1970 should not be allowed as it might cause unexpected errors since aggregate table views and many calculations rely on tz table and timezone offset.
   * @returns
   */
  async seed() {
    logger.log({ at: "flux.seed" });
    try {
      let offset = 0;
      let label: string | undefined;
      const timeZone = detectTimeZone();
      if (!timeZone) {
        const val = detectTimeZoneFallback();
        offset = val.offset;
        label = val.label;
      }
      const params: IInsertMutation<any> = {
        records: [
          {
            offset,
            date: new Date(Date.UTC(1970, 0, 1)).toISOString(),
            createdAt: new Date().toISOString(),
            label: label ?? "",
            id: generateRandomId()
          }
        ],
        action: PersistenceActionType.INSERT
      };
      await this.persistence.mutation(Resource.tz, params);
      if (!this.isLocalMode) {
        await this.insertMutation(Resource.tz, params);
      }
    } catch (e) {
      logger.error({ at: "flux.seed", error: e });
    }
  }

  async mutation<T extends IResource>(
    resource: Resource,
    params: IMutationParamsv2<T>
  ) {
    let response;
    logger.log({ at: "flux.mutation", resource, params });
    try {
      response = await this.persistence.mutation(resource, params);
      if (!this.isLocalMode) {
        await this.insertMutation(resource, params);
        if (this.isExtensionEnvironment) {
          setTimeout(async () => {
            await this.sync();
          }, 100);
        }
      }
      if (this.isExtensionEnvironment) {
          const message = {
            event: ExtensionEvent.MUTATION,
          data: { resource, params }
        };
        relayToSidePanel(message);
        relayToContentScript(message);
      } else {
        dispatchCustomEvent(GlobalEvent.MUTATION, { resource, params });

      }
      const correspondingStore = this.stores.find((x) => x.id === resource);
      if (correspondingStore?.isInMemory) {
        await this.loadInMemoryResourceStore(resource);
      }
    } catch (e) {
      logger.error({
        at: "flux.mutation",
        resource,
        params,
        error: e
      });
    }
    const dependantStores = this.resolveDependantStores(resource);
    //TODO refresh stores
    logger.log({
      at: "flux.mutation - result",
      resource,
      response,
      action: params.action,
      records: params.records,
      record: params.record ?? params.records?.[0]
    });
    return response;
  }

  /**
   * Inserts a mutation record into the mutation table. This is used for syncing to cloud and also for resource versioning.
   *
   * Note: if multiple resources are involved in the mutation like INSERT operation or BULK MERGE operation, then accessLog table is logged with the information for resource versioning.
   *
   * @param resource
   * @param params
   * @returns
   */
  private async insertMutation<T extends IResource>(
    resource: Resource,
    params: IMutationParamsv2<T>
  ) {
    logger.log({ at: "flux.insertMutation", resource, params });
    const mutationId = generateRandomId();
    const userId = await resolveCurrentUserId();
    const mutation: IMutation = {
      id: mutationId,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      timestamp: new Date().getTime(),
      userId,
      resource,
      params,
      resourceId: this.resolveResourceId(params),
      action: this.resolveAction(params?.action)
    };
    return this.persistence.mutation(Resource.mutation, {
      records: [mutation],
      action: PersistenceActionType.INSERT
    });
  }

  private resolveResourceId<T extends IResource>(params: IMutationParamsv2<T>) {
    switch (params?.action) {
      case PersistenceActionType.INSERT:
      case PersistenceActionType.BULK_MERGE:
        return params?.records.map((x) => x.id);
      case PersistenceActionType.REPLACE:
      case PersistenceActionType.MERGE:
        return params?.record?.id;
      case PersistenceActionType.DELETE:
        return params?.recordId;
      default:
        return undefined;
    }
  }

  private resolveAction(action: PersistenceActionType) {
    switch (action) {
      case PersistenceActionType.INSERT:
        return ResourceActionType.CREATE;
      case PersistenceActionType.REPLACE:
      case PersistenceActionType.MERGE:
        return ResourceActionType.EDIT;
      case PersistenceActionType.DELETE:
        return ResourceActionType.DELETE;
      default:
        return ResourceActionType.EDIT;
    }
  }

  async select(resourceId: IRecordId, properties?: string[]) {
    try {
      logger.log({ at: "flux.select", resourceId });
      const result = await this.persistence.select(resourceId, properties);
      logger.log({ at: "flux.select - result", result });
      return result;
    } catch (e) {
      logger.error({
        at: "flux.select",
        resourceId,
        error: e
      });
    }
  }

  async selectMany(resource: Resource, params?: IResourceSelectParams) {
    try {
      logger.log({ at: "flux.selectMany", resource, params });
      const result = await this.persistence.selectMany(resource, params);
      logger.log({ at: "flux.selectMany - result", resource, params, result });
      return result;
    } catch (e) {
      logger.error({
        at: "flux.select",
        resource,
        params,
        error: e
      });
    }
  }

  async selectByQuery(query: string, params?: any) {
    if (this.provider === PersistenceProvider.DEXIE_SURREAL) {
      return this.remote.query(query, params);
    }
    return this.persistence.query(query, params);
  }

  async kvMerge(storeId: string, data: any) {
    const record = {
      ...data,
      id: `kv:${storeId}`
    };
    logger.log({ at: "kvMerge", storeId, data, record });
    const result = await this.persistence.mutation(Resource.kv, {
      record,
      action: PersistenceActionType.MERGE
    });
    logger.log({ at: "kvMerge - result", storeId, record, result });
    if (!this.isLocalMode) {
      await this.insertMutation(Resource.kv, {
        record,
        action: PersistenceActionType.MERGE
      });
      if (this.isExtensionEnvironment) {
        setTimeout(async () => {
          await this.sync();
        }, 100);
      }
    }
    return result;
  }

  private resolveDependantStores(resource: Resource) {
    const stores: string[] = [];
    this.stores.filter((store) => {
      if (store?.resourceDependencies?.includes(resource)) {
        stores.push(store.id);
      }
    });
    return stores;
  }

  async refresh(storeId: string, isShowRefreshingState: boolean = false) {
    logger.log({ at: "flux.refresh", storeId });
  }

  async refreshPage(
    storeIdentifiers: string[],
    isShowRefreshingState: boolean = false
  ) {}

  /**
   * Sync up the local changes and from response - syncs down the changes from cloud.
   * @returns
   */
  async sync() {
    const isOffline = await determineIfOffline();
    if (isOffline) return;
    const { mutations, lastSyncUp } = await this.resolveItemsForSyncUp();
    logger.log({ at: "flux.sync", mutations, lastSyncUp });
    if (!mutations || mutations.length === 0) return;
    const local = await this.resolveLocal();
    const lastSyncDown =
      local?.lastSyncDown ?? new Date().getTime() - 1000 * 60 * 60 * 24;
    const resources = this.resolveSyncResources();
    const syncDownData = await this.syncer.sync(
      mutations,
      lastSyncDown,
      resources,
      local?.dapId
    );
    if (syncDownData) {
      await this.processSyncDown(syncDownData);
    }
    // clientStorage.set(
    //   ClientStorageKey.LAST_SYNC_UP,
    //   mutations[mutations.length - 1].timestamp
    // );
    await this.persistence.mutation(Resource.kv, {
      record: {
        id: "kv:local",
        lastSyncUp: mutations[mutations.length - 1].timestamp
      },
      action: PersistenceActionType.MERGE
    });
  }

  async resolveItemsForSyncUp() {
    // const lastSyncedAt = await clientStorage.get(ClientStorageKey.LAST_SYNC_UP);
    const local = await this.resolveLocal();
    if (!local) return { mutations: [], lastSyncUp: 0 };
    const lastSyncUp =
      local?.lastSyncUp ?? new Date().getTime() - 1000 * 60 * 60 * 24;
    const dapId = await this.resolveDapId(local);
    logger.log({
      at: "flux.resolveItemsForSyncUp",
      lastSyncUp,
      local,
      dapId
    });
    let mutations: IMutation[] = await this.persistence.selectMany(
      Resource.mutation,
      {
        filters: {
          timestamp: {
            greaterThan: +lastSyncUp
          }
        },
        orderBy: {
          timestamp: "asc"
        }
      }
    );
    mutations = mutations.map((x) => ({ ...x, dapId }));
    logger.log({ at: "flux.resolveItemsForSyncUp", lastSyncUp, mutations });
    return { mutations, lastSyncUp };
  }

  async search(storeId: string, query: string) {
    const store = this.stores.find((x) => x.id === storeId);
    if (store) {
      return store?.search?.(query);
    }
  }

  private resolveLocal() {
    return this.persistence.select("kv:local");
  }

  private async resolveDapId(local: ILocal) {
    if (!local.dapId || local.dapId === "" || typeof local.dapId !== "string") {
      const dapId = await clientStorage.get(ClientStorageKey.DAP_ID);
      if (!dapId) {
        throw new Error("DAP ID not found");
      }
      await this.persistence.mutation(Resource.kv, {
        record: {
          id: "kv:local",
          dapId
        },
        action: PersistenceActionType.MERGE
      });
      return dapId;
    }
    return local.dapId;
  }

  /**
   * Syncs down from cloud to local.
   */
  async syncDown() {
    logger.log({ at: "flux.syncDown" });
    try {
      if (await determineIfOffline()) return;
      if (this.isSyncDownPending) return;
      this.isSyncDownPending = true;
      const local = await this.resolveLocal();
      const lastSyncDown =
        local?.lastSyncDown ?? new Date().getTime() - 1000 * 60 * 60 * 24;
      const dapId = await this.resolveDapId(local);
      const resources = this.resolveSyncResources();
      const result = await this.syncer.syncDown(lastSyncDown, resources, dapId);
      this.isSyncDownPending = false;
      if (result) {
        await this.processSyncDown(result);
      }
    } catch (e) {
      logger.error({ at: "flux.syncDown", error: e });
    } finally {
      this.isSyncDownPending = false;
    }
  }

  private async processSyncDown(response: any) {
    if (!response || !Array.isArray(response) || response.length === 0) {
      return;
    }
    const mutations: IMutation[] = response;
    logger.log({ at: "processSyncDown", mutations });
    if (!mutations || mutations.length === 0) return;
    for (let mutation of mutations) {
      await this.persistence.mutation(
        mutation.resource as Resource,
        mutation.params
      );
    }
    logger.log({
      at: "flux.syncDown - loading in memory stores",
      mutations
    });
    await this.loadInMemoryStores();
    // await clientStorage.set(
    //   ClientStorageKey.LAST_SYNC_DOWN,
    //   mutations[mutations.length - 1].timestamp
    // );
    await this.persistence.mutation(Resource.kv, {
      record: {
        id: "kv:local",
        lastSyncDown: mutations[mutations.length - 1].timestamp
      },
      action: PersistenceActionType.MERGE
    });
    if (!this.isExtensionEnvironment) {
      dispatchCustomEvent(GlobalEvent.SYNC_DOWN);
    }
    return mutations;
  }

  /**
   * Clones down from cloud to local.
   */
  async cloneDown() {
    logger.log({ at: "flux.cloneDown", stores: this.stores });
    if (await determineIfOffline()) return;
    const resources = this.resolveSyncResources();
    const result = await this.syncer.cloneCloudToLocal({
      resources,
      isExtension: this.isExtensionEnvironment
    });
    for (let i = 0; i < result.length; i++) {
      const resource = resources[i];
      const resourceResponse = result[i];
      if (resourceResponse.result && resourceResponse.result.length > 0) {
        await this.persistence.mutation(resource as Resource, {
          records: resourceResponse.result,
          action: PersistenceActionType.INSERT
        });
      }
    }
    await this.loadInMemoryStores();
    // await clientStorage.set(
    //   ClientStorageKey.LAST_SYNC_DOWN,
    //   new Date().getTime()
    // );
    // await clientStorage.set(
    //   ClientStorageKey.LAST_SYNC_UP,
    //   new Date().getTime()
    // );
    await this.persistence.mutation(Resource.kv, {
      record: {
        id: "kv:local",
        lastSyncDown: new Date().getTime(),
        lastSyncUp: new Date().getTime()
      },
      action: PersistenceActionType.MERGE
    });
  }

  /**
   * TODO - files upload to s3
   * @returns
   */
  async cloneUp() {
    logger.log({ at: "flux.cloneUp" });
    if (await determineIfOffline()) return;
    const resources = this.resolveSyncResources();
    for (let resource of resources) {
      const records = await this.persistence.selectMany(resource as Resource);
      await this.syncer.cloneLocalToCloud(resource, records);
    }
  }

  private resolveSyncResources(): Resource[] {
    const resources = [
      Resource.kv,
      ...(this.stores
        .filter((x) => x.dataType === StoreDataType.IFR)
        .map((x) => x.id) ?? [])
    ] as Resource[];
    return resources;
  }

  /**
   * Invalidates the stores and persistance connection - used during events like User logout or switching spaces.
   */
  async terminate() {}

  /**
   * Exports the local database as a backup json or csv based on user selection.
   */
  async export(method: "json" | "csv") {}
  /**
   * Imports a backup json or csv file into the local database.
   */
  async import() {}
}

export let flux = Flux._instance as any as Flux;

export async function initFlux(
  stores: IStore[],
  provider: PersistenceProvider,
  persistence: IPersistence,
  params: {
    dapId: string;
    userId?: string;
    appVersion?: string;
  }
) {
  logger.log({ at: "initFlux", stores, provider, persistence, params });
  const result = await Flux.initialize(stores, provider, persistence, params);
  flux = Flux._instance as any as Flux;
  return result;
}
