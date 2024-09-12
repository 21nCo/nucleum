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
import type { IFlux, FluxStoreConstructor, FluxStoreType } from "./flux.type";
import {
  ClientStorageKey,
  type IPersistence,
  PersistenceProvider
} from "$lib/client/persistence/persistence.type";
import { clientStorage } from "$lib/client/persistence/persistence.utils";
import { SurrealPersistence } from "$lib/client/persistence/surreal/surreal.local";
import { SurrealSync } from "$lib/client/persistence/surreal/surreal.sync";

class Flux {
  static _instance: Flux | null = null;
  private _stores: { [key: string]: FluxStoreType } = {};
  stores: IStore[] = [];
  provider!: PersistenceProvider;
  persistence!: IPersistence;

  private constructor() {}
  // constructor(provider: PersistenceProvider) {
  //   this.provider = provider;
  //   switch (provider) {
  //     case PersistenceProvider.SURREAL_SURREAL:
  //       this.persistence = new SurrealPersistence();
  //       break;
  //     default:
  //       this.persistence = new SurrealPersistence();
  //       break;
  //   }
  // }

  static async initializev2(
    storeConstructors: { [key: string]: FluxStoreConstructor },
    provider: PersistenceProvider,
    userId: string,
    params?: {
      isLocalMode?: boolean;
    }
  ): Promise<void> {
    if (!Flux._instance) {
      Flux._instance = new Flux();

      for (const [key, StoreClass] of Object.entries(storeConstructors)) {
        Flux._instance._stores[key] = new StoreClass(Flux._instance);
      }

      Flux._instance.provider = provider;
      await Flux._instance.initializePersistence(
        Object.values(Flux._instance._stores),
        userId,
        params
      );
      switch (provider) {
        case PersistenceProvider.SURREAL_SURREAL:
          Flux._instance.persistence = new SurrealPersistence();
          break;
        default:
          Flux._instance.persistence = new SurrealPersistence();
          break;
      }
    }
  }

  static get instance(): Flux {
    if (!Flux._instance) {
      throw new Error(
        "Stores have not been initialized. Call Stores.initialize() first."
      );
    }
    return new Proxy(Flux._instance, {
      get(target, prop: string) {
        if (prop in target._stores) {
          return target._stores[prop];
        }
        if (prop in target && typeof (target as any)[prop] === "function") {
          return (target as any)[prop].bind(target);
        }
        throw new Error(
          `Store or method '${prop}' not found. Make sure it's registered and initialized.`
        );
      }
    });
  }

  /**
   * @param stores
   * @param userId
   * @param params
   */
  private async initializePersistence(
    stores: IStore[],
    userId: string,
    params?: {
      isLocalMode?: boolean;
    }
  ) {
    logger.log({ at: "dataManagerV2.initialize", stores, userId, params });
    this.stores = stores;
    const dbo = [...resolveDboDependencies()];
    await this.persistence.initialize(userId, {
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

  /**
   * This method will be called on signup and database is bootstrapped.
   * This will persist all kv seed data on cloud.
   */
  async seed() {
    try {
      let data = this.stores
        .filter((x) => x.dataType === StoreDataType.KVO)
        .map((x) => {
          const k = x as IObservableStore<any>;
          return { id: k.id, ...k.seed };
        });
      data = [...data, { id: "mutationMap" }];
      await this.tzSeed();
      return this.persistence.insert(data, Resource.kv);
    } catch (e) {
      logger.error({ at: "dataManagerV2.bootstrap", error: e });
    }
  }

  /**
   * Adds a timezone record to the database on signup with 1970 as lowest to enable adding manual logs in the past or importing data from the past.
   *
   * Note: Any manual logs or imports prior to 1970 should not be allowed as it might cause unexpected errors since aggregate table views and many calculations rely on tz table and timezone offset.
   * @returns
   */
  async tzSeed() {
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
    logger.log({ at: "dataManagerV2.mutation", resource, params });
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
        at: "dataManagerV2.mutation",
        resource,
        params,
        error: e
      });
    }
    const dependantStores = this.resolveDependantStores(resource);
    //TODO refresh stores
    logger.log({
      at: "dataManagerV2.mutation - result",
      resource,
      response,
      params
    });
    return response;
  }

  async select(resourceId: IRecordId, properties?: string[]) {
    try {
      logger.log({ at: "dataManagerV2.select", resourceId });
      const result = await this.persistence.select(resourceId, properties);
      logger.log({ at: "dataManagerV2.select - result", result });
      return result;
    } catch (e) {
      logger.error({
        at: "dataManagerV2.select",
        resourceId,
        error: e
      });
    }
  }

  async selectMany(resource: Resource, params?: IResourceSelectParams) {
    try {
      logger.log({ at: "dataManagerV2.selectMany", resource, params });
      const result = await this.persistence.selectMany(resource, params);
      logger.log({ at: "dataManagerV2.selectMany - result", result });
      return result;
    } catch (e) {
      logger.error({
        at: "dataManagerV2.select",
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

  async sync() {
    const lastSyncedAt = clientStorage.get(ClientStorageKey.LAST_SYNCED_AT);
    logger.log({ at: "DataManagerV2.sync", lastSyncedAt });
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
    switch (this.provider) {
      case PersistenceProvider.SURREAL_SURREAL:
        await new SurrealSync().sync(mutations);
        break;
      default:
        break;
    }
    clientStorage.set(ClientStorageKey.LAST_SYNCED_AT, new Date().getTime());
  }

  async search(storeId: string, query: string) {
    const store = this.stores.find((x) => x.id === storeId);
    if (store) {
      return store?.search?.(query);
    }
  }
}

export const flux: IFlux = Flux._instance as any as IFlux;

// export const flux = new DataManagerV2(PersistenceProvider.SURREAL_SURREAL);

export function initFlux(
  storeConstructors: { [key: string]: FluxStoreConstructor },
  provider: PersistenceProvider,
  userId: string,
  params?: {
    isLocalMode?: boolean;
  }
) {
  return Flux.initializev2(storeConstructors, provider, userId, params);
}
