import { logger } from "$lib/client/components/debug/logger.client";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import type { IResource } from "$lib/client/components/flux/resourceStores/resource.type";
import {
  type IStore,
  PersistenceActionType,
  type IMutationParamsv2,
  StoreDataType,
  type IObservableStore,
  type IResourceSelectParams,
  type IRecordId
} from "$lib/client/types/data.type";
import {
  detectTimeZone,
  detectTimeZoneFallback
} from "$lib/client/utils/time.utils";
import {
  ClientStorageKey,
  type IPersistence,
  type ISyncHandler,
  PersistenceProvider
} from "$lib/client/persistence/persistence.type";
import { clientStorage } from "$lib/client/persistence/persistence.utils";
import { SurrealPersistence } from "$lib/client/persistence/surreal/surreal.local";
import { SurrealSync } from "$lib/client/persistence/surreal/surreal.sync";

class Flux {
  static _instance: Flux | null = null;
  stores: IStore[] = [];
  provider!: PersistenceProvider;
  persistence!: IPersistence;
  syncer!: ISyncHandler;
  private isLocalMode: boolean = false;
  private constructor() {}

  static initialize(
    stores: IStore[],
    provider: PersistenceProvider,
    userId: string,
    params?: {
      isLocalMode?: boolean;
    }
  ): Promise<number> {
    logger.log({ at: "flux.initialize", stores, userId, params });
    Flux._instance = new Flux();
    Flux._instance.provider = provider;
    Flux._instance.isLocalMode = params?.isLocalMode ?? false;
    switch (provider) {
      case PersistenceProvider.SURREAL_SURREAL:
        Flux._instance.persistence = new SurrealPersistence();
        Flux._instance.syncer = new SurrealSync(Flux._instance.persistence);
        break;
      default:
        Flux._instance.persistence = new SurrealPersistence();
        break;
    }
    logger.debug({ at: "flux.initialized", instance: Flux._instance });
    return Flux._instance.initializePersistence(stores, userId, params);
  }

  /**
   * @param stores
   * @param userId
   * @param params
   */
  private initializePersistence(
    stores: IStore[],
    userId: string,
    params?: {
      isLocalMode?: boolean;
    }
  ) {
    logger.log({ at: "flux.initializePersistence", stores, userId, params });
    this.stores = stores;
    const dbo = [...resolveDboDependencies()];
    return this.persistence.initialize(userId, {
      ...params,
      dbo
    });

    function resolveDboDependencies(): Set<string> {
      return new Set(
        stores
          .map((x) => x.dboDependencies)
          .filter((x) => x !== undefined)
          .flat()
      );
    }
  }

  async loadKvStores() {
    logger.debug({ at: "flux.loadKvStores" });
    try {
      let kvStores = this.stores.filter(
        (x) => x.dataType === StoreDataType.KVO
      );
      const data = await this.persistence.selectMany(Resource.kv);
      data.forEach((record: any) => {
        const store = kvStores.find(
          (x) => "kv:" + x.id === record.id.toString()
        );
        if (!store || !store.loader) return;
        store.loader(record);
      });
    } catch (e) {
      logger.error({ at: "flux.loadKvStores", error: e });
    }
  }

  /**
   * This method will be called on signup and database is bootstrapped.
   * This will persist all kv seed data on cloud.
   */
  async kvSeed() {
    logger.debug({ at: "flux.seed" });
    try {
      let data = this.stores
        .filter((x) => x.dataType === StoreDataType.KVO)
        .map((x) => {
          const k = x as IObservableStore<any>;
          return { id: k.id, ...k.seed };
        });
      data = [...data, { id: "mutationMap" }];
      await this.seed();
      return this.persistence.insert(data, Resource.kv);
    } catch (e) {
      logger.error({ at: "flux.seed", error: e });
    }
  }

  /**
   * Adds a timezone record to the database on signup with 1970 as lowest to enable adding manual logs in the past or importing data from the past.
   *
   * Note: Any manual logs or imports prior to 1970 should not be allowed as it might cause unexpected errors since aggregate table views and many calculations rely on tz table and timezone offset.
   * @returns
   */
  async seed() {
    let offset = 0;
    let label: string | undefined;
    const timeZone = detectTimeZone();
    if (!timeZone) {
      const val = detectTimeZoneFallback();
      offset = val.offset;
      label = val.label;
    }
    await this.persistence.insert(
      [
        {
          offset,
          date: new Date(Date.UTC(1970, 0, 1)).toISOString(),
          label: label ?? ""
        }
      ],
      Resource.tz
    );
  }

  async mutation<T extends IResource>(
    resource: Resource,
    params: IMutationParamsv2<T>
  ) {
    let response;
    logger.log({ at: "flux.mutation", resource, params });
    try {
      switch (params.action) {
        case PersistenceActionType.CUSTOM:
          response = await this.persistence.query(params.query, params.data);
          break;
        case PersistenceActionType.INSERT:
          response = await this.persistence.insert<T>(
            params.resources,
            resource
          );
          break;
        case PersistenceActionType.MERGE:
          response = await this.persistence.merge<T>(params.resource);
          break;
        case PersistenceActionType.REPLACE:
          response = await this.persistence.replace<T>(params.resource);
          break;
        case PersistenceActionType.DELETE:
          response = await this.persistence.delete(params.resourceId);
          break;
        case PersistenceActionType.BULK_MERGE:
          response = await this.persistence.bulkEdit<T>(
            resource,
            params.resources
          );
          break;
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
      params
    });
    return response;
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
      logger.debug({ at: "flux.selectMany", resource, params });
      const result = await this.persistence.selectMany(resource, params);
      logger.log({ at: "flux.selectMany - result", result });
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
    return this.persistence.query(query, params);
  }

  kvMerge(storeId: string, data: any) {
    logger.log({ at: "kvMerge", storeId, data });
    return this.persistence.merge({
      ...data,
      id: `kv:${storeId}`
    });
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

  async refresh(storeId: string, isShowRefreshingState: boolean = false) {}

  async refreshPage(
    storeIdentifiers: string[],
    isShowRefreshingState: boolean = false
  ) {}

  /**
   * Sync up the local changes and from response - syncs down the changes from cloud.
   * @returns
   */
  async sync() {
    const lastSyncedAt = clientStorage.get(ClientStorageKey.LAST_SYNCED_AT);
    logger.debug({ at: "flux.sync", lastSyncedAt });
    if (!lastSyncedAt) return;
    const mutations = await this.persistence.selectMany(Resource.mutation, {
      filters: {
        createdAt: {
          from: lastSyncedAt
            ? new Date(+lastSyncedAt).toISOString()
            : new Date().toISOString(),
          to: new Date().toISOString()
        }
      }
    });
    if (!mutations || mutations.length === 0) return;
    await this.syncer.sync(mutations);
    clientStorage.set(ClientStorageKey.LAST_SYNCED_AT, new Date().getTime());
  }

  async search(storeId: string, query: string) {
    const store = this.stores.find((x) => x.id === storeId);
    if (store) {
      return store?.search?.(query);
    }
  }
  /**
   * Syncs down from cloud to local.
   */
  async syncDown() {
    logger.debug({ at: "flux.syncDown" });
    await this.syncer.syncDown();
    clientStorage.set(ClientStorageKey.LAST_SYNCED_AT, new Date().getTime());
  }

  /**
   * Clones down from cloud to local.
   */
  async cloneDown() {
    logger.debug({ at: "flux.cloneDown", stores: this.stores });
    const resources = this.resolveCloneResources();
    await this.syncer.cloneCloudToLocal(resources);
    clientStorage.set(ClientStorageKey.LAST_SYNCED_AT, new Date().getTime());
  }

  async cloneUp() {
    logger.debug({ at: "flux.cloneUp" });
    const resources = this.resolveCloneResources();
    await this.syncer.cloneLocalToCloud(resources);
    clientStorage.set(ClientStorageKey.LAST_SYNCED_AT, new Date().getTime());
  }

  private resolveCloneResources() {
    const resources = [
      Resource.kv,
      ...(this.stores
        .filter((x) => x.dataType === StoreDataType.IFR)
        .map((x) => x.id) ?? [])
    ];
    return resources;
  }

  /**
   * Invalidates the stores and persistance connection - used during events like User logout or switching spaces.
   */
  terminate() {}
}

export let flux = Flux._instance as any as Flux;

export async function initFlux(
  stores: IStore[],
  provider: PersistenceProvider,
  userId: string,
  params?: {
    isLocalMode?: boolean;
  }
) {
  const result = await Flux.initialize(stores, provider, userId, params);
  flux = Flux._instance as any as Flux;
  return result;
}
