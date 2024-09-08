import { logger } from "../components/debug/logger.client";
import { Resource } from "../components/resourceStores/resource.enum";
import type { IResource } from "../components/resourceStores/resource.type";
import {
  type IStore,
  PersistenceActionType,
  type IMutationParamsv2,
  StoreDataType,
  type IObservableStore,
  type IResourceSelectParams,
  type IRecordId
} from "../types/data.type";
import {
  ClientStorageKey,
  type IPersistence,
  PersistenceProvider
} from "./persistence.type";
import { clientStorage } from "./persistence.utils";
import { SurrealPersistence } from "./surreal/surreal.local";
import { SurrealSync } from "./surreal/surreal.sync";

class DataManagerV2 {
  stores: IStore[] = [];
  provider: PersistenceProvider;
  persistence: IPersistence;
  constructor(provider: PersistenceProvider) {
    this.provider = provider;
    switch (provider) {
      case PersistenceProvider.SURREAL_SURREAL:
        this.persistence = new SurrealPersistence();
        break;
      default:
        this.persistence = new SurrealPersistence();
        break;
    }
  }

  async initialize(
    stores: IStore[],
    userId: string,
    params?: {
      isLocalMode?: boolean;
    }
  ) {
    logger.debug({ at: "dataManagerV2.initialize", stores, userId, params });
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
      return this.persistence.insert(data, Resource.kv);
    } catch (e) {
      logger.error({ at: "dataManagerV2.bootstrap", error: e });
    }
  }

  async mutation<T extends IResource>(
    resource: Resource,
    params: IMutationParamsv2<T>
  ) {
    let response;
    logger.debug({ at: "dataManagerV2.mutation", resource, params });
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
    logger.debug({
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
      logger.debug({ at: "dataManagerV2.selectMany", resource, params });
      const result = await this.persistence.selectMany(resource, params);
      logger.debug({ at: "dataManagerV2.selectMany - result", result });
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
    logger.debug({ at: "kvMerge", storeId, data });
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
    logger.debug({ at: "DataManagerV2.sync", lastSyncedAt });
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
}

export const flux = new DataManagerV2(PersistenceProvider.SURREAL_SURREAL);
