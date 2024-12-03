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
  type IInsertMutation,
  type IMutationAdditionalParams
} from "$lib/client/types/data.type";
import {
  detectTimeZone,
  detectTimeZoneFallback
} from "$lib/client/utils/time.utils";
import {
  type ILocal,
  type IPersistence,
  PersistenceProvider
} from "$lib/client/persistence/persistence.type";
import {
  dispatchCustomEvent,
  isExtensionEnvironment
} from "$lib/client/utils/browser.utils";
import { getDapId } from "$lib/client/persistence/persistence.utils";
import { generateRandomId } from "$lib/shared/utils/crypto.utils";
import type { ISurrealDatabase } from "$lib/client/types/db.type";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";

import { resolveCurrentUserId } from "$lib/client/utils/account.utils";
import { GlobalEvent } from "$lib/client/types/event.enum";
import {
  determineIfOffline,
  performApiCall
} from "$lib/client/utils/network.utils";
import { ExtensionEvent } from "$lib/client/types/extension.type";
import {
  relayToContentScript,
  relayToSidePanel
} from "$lib/client/utils/extension.utils";
import { SyncMethod } from "$lib/shared/types/sync.type";

class Flux {
  static _instance: Flux | null = null;
  stores: IStore[] = [];
  provider!: PersistenceProvider;
  persistence!: IPersistence;
  // syncer!: ISyncHandler;
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
        // Flux._instance.syncer = new SurrealSync(Flux._instance.remote);
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
    params: IMutationParamsv2<T>,
    additionalParams: IMutationAdditionalParams = {}
  ) {
    let response;
    logger.log({ at: "flux.mutation", resource, params });
    try {
      response = await this.persistence.mutation(resource, params);
      let mutation: IMutation;
      if (
        !additionalParams?.isPreventCloudPersistence &&
        (!this.isLocalMode || this.isExtensionEnvironment)
      ) {
        mutation = await this.insertMutation(resource, params);
      }
      if (this.isExtensionEnvironment) {
        setTimeout(async () => {
          await this.sync(mutation);
        }, 100);
      }
      if (!additionalParams?.isPreventSubscriptions) {
        if (this.isExtensionEnvironment) {
          const message = {
            event: ExtensionEvent.MUTATION,
            data: { resource, params }
          };
          relayToSidePanel(message);
          relayToContentScript(message);
        } else {
          dispatchCustomEvent(GlobalEvent.MUTATION, {
            resource,
            params,
            context: additionalParams?.context
          });
        }
        const correspondingStore = this.stores.find((x) => x.id === resource);
        if (correspondingStore?.isInMemory) {
          await this.loadInMemoryResourceStore(resource);
        }
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
    await this.persistence.mutation(Resource.mutation, {
      records: [mutation],
      action: PersistenceActionType.INSERT
    });
    return mutation;
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

  async performSync(method: SyncMethod, data: any) {
    try {
      const result = await performApiCall(`sync/${method}`, "POST", data);
      let response;
      if (result?.ok) {
        response = await result.json();
      }
      logger.log({
        at: "flux.performSync",
        method,
        data,
        response,
        result
      });
      if (method === SyncMethod.SYNC_UP) {
        if (response && response.length > 0) {
          const syncDownData = response[response.length - 1];
          if (syncDownData?.result && syncDownData.result.length > 0) {
            return { response, syncDownData: syncDownData.result };
          }
        }
        return { response, syncDownData: [] };
      } else if (method === SyncMethod.SYNC_DOWN) {
        if (
          response &&
          Array.isArray(response) &&
          response.length > 0 &&
          response[0].result
        ) {
          const syncDownData = response[0].result;
          const countsRawData = response.slice(1).map((x) => x.result);
          let counts: { [key: string]: number } = {};
          countsRawData.forEach((element) => {
            counts = { ...counts, ...element };
          });
          return { syncDownData, counts };
        }
        return { syncDownData: [], counts: {} };
      }
      return response;
    } catch (e) {
      logger.error({ at: "flux.performSync", method, data, error: e });
    }
  }

  /**
   * Sync up the local changes and from response - syncs down the changes from cloud.
   * @returns
   */
  async sync(mutation?: IMutation) {
    try {
      const isOffline = await determineIfOffline();
      if (isOffline && this.isExtensionEnvironment) {
        //TODO - user feedback that internet connection is required for sync to work
        console.log("offline detected - extension");
        return;
      } else if (isOffline) return;
      logger.log({
        at: "flux.sync",
        mutation,
        isExtensionEnvironment: this.isExtensionEnvironment
      });
      const local = await this.resolveLocal();
      const lastSyncDown =
        local?.lastSyncDown ?? new Date().getTime() - 1000 * 60 * 60 * 24;
      const dapId = await this.resolveDapId(local);
      let response;
      if (this.isExtensionEnvironment && mutation) {
        response = await this.performSync(SyncMethod.SYNC_UP, {
          mutations: [{ ...mutation, dapId }],
          lastSyncDown,
          resources: this.resolveSyncResources(),
          dapId
        });
      } else {
        const { mutations, lastSyncUp } = await this.resolveItemsForSyncUp();
        logger.log({ at: "flux.sync", mutations, lastSyncUp });
        if (!mutations || mutations.length === 0) return;
        const resources = this.resolveSyncResources();
        response = await this.performSync(SyncMethod.SYNC_UP, {
          mutations,
          lastSyncDown,
          resources,
          dapId
        });
        await this.persistence.mutation(Resource.kv, {
          record: {
            id: "kv:local",
            lastSyncUp: mutations[mutations.length - 1].timestamp
          },
          action: PersistenceActionType.MERGE
        });
      }
      logger.log({ at: "flux.sync - response", mutation, response });
      if (response?.syncDownData) {
        await this.processSyncDown(response.syncDownData);
      }
      return response;
    } catch (e) {
      logger.error({ at: "flux.sync", error: e });
    }
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
      const dapId = await getDapId();
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
  async syncDown(isFirstLoad: boolean = false) {
    logger.log({ at: "flux.syncDown", isFirstLoad });
    let isShowCompletedStatus: boolean = true;
    try {
      if (await determineIfOffline()) return;
      if (this.isSyncDownPending) return;
      this.isSyncDownPending = true;
      const local = await this.resolveLocal();
      const lastSyncDown =
        local?.lastSyncDown ?? new Date().getTime() - 1000 * 60 * 60 * 24;
      const dapId = await this.resolveDapId(local);
      const resources = this.resolveSyncResources();
      const result = await this.performSync(SyncMethod.SYNC_DOWN, {
        lastSyncDown,
        resources,
        dapId
      });
      this.isSyncDownPending = false;
      logger.log({ at: "flux.syncDown - result", result });
      if (result.syncDownData) {
        const status = await this.processSyncDown(
          result.syncDownData,
          isFirstLoad
        );
        if (status === -1) {
          isShowCompletedStatus = false;
        }
      }
      if (isFirstLoad && result.counts) {
        let resourcesWithMissSync = [];
        for (let resource of resources) {
          const localCount = (
            await this.persistence.selectMany(resource as Resource)
          ).length;
          const cloudCount = result.counts[resource];
          if (localCount < cloudCount) {
            resourcesWithMissSync.push(resource);
            logger.log({
              at: "flux.syncDown - resource with miss sync",
              resource,
              localCount,
              cloudCount
            });
          }
        }
        logger.log({
          at: "flux.syncDown - resourcesWithMissSync",
          resourcesWithMissSync
        });
        if (resourcesWithMissSync.length > 0) {
          await this.cloneDown({
            resources: resourcesWithMissSync,
            isReconciliation: true
          });
        }
      }
      return result;
    } catch (e) {
      logger.error({ at: "flux.syncDown", error: e });
    } finally {
      if (
        !this.isExtensionEnvironment &&
        isFirstLoad &&
        isShowCompletedStatus
      ) {
        dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
          message: `Sync completed.`,
          subMessage: "",
          isFinished: true
        });
      }
      this.isSyncDownPending = false;
    }
  }

  private async processSyncDown(response: any, isFirstLoad: boolean = false) {
    if (!response || !Array.isArray(response) || response.length === 0) {
      return;
    }
    const mutations: IMutation[] = response;
    if (mutations.length > 50 && isFirstLoad) {
      await this.clear();
      window.location.reload();
      return -1;
    }
    logger.log({ at: "processSyncDown", mutations, isFirstLoad });
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
  async cloneDown(params?: {
    isReconciliation?: boolean;
    resources?: Resource[];
  }) {
    logger.log({ at: "flux.cloneDown", stores: this.stores });
    try {
      if (await determineIfOffline()) return;
      const resources = params?.resources ?? this.resolveSyncResources();
      const result = await this.performSync(SyncMethod.CLONE_DOWN, {
        resources,
        isExtension: this.isExtensionEnvironment
      });
      for (let i = 0; i < result.length; i++) {
        const resource = resources[i];
        const resourceResponse = result[i];
        if (resourceResponse.result && resourceResponse.result.length > 0) {
          console.time(`cloneDown - ${resource}`);
          if (!this.isExtensionEnvironment && resource !== Resource.kv) {
            dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
              subMessage: `Syncing ${resource}s...`
            });
          }
          if (resource === Resource.kv) {
            resourceResponse.result = resourceResponse.result.filter(
              (x: any) => !x.id.toString().includes("local")
            );
          }
          const result = await this.persistence.mutation(resource as Resource, {
            records: resourceResponse.result,
            action:
              params?.isReconciliation ||
              resource === Resource.kv ||
              resource === Resource.link
                ? PersistenceActionType.INSERT
                : PersistenceActionType.BULK_INSERT
          });
          logger.log({
            at: "flux.cloneDown - result",
            resource,
            records: resourceResponse.result,
            result
          });
          if (!result) {
            const fallbackResult = await this.persistence.mutation(
              resource as Resource,
              {
                records: resourceResponse.result,
                action: PersistenceActionType.INSERT
              }
            );
            logger.log({
              at: "flux.cloneDown - fallbackResult",
              resource,
              fallbackResult
            });
          }
          console.timeEnd(`cloneDown - ${resource}`);
        }
      }
      if (params?.isReconciliation) return true;
      await this.loadInMemoryStores();
      await this.persistence.mutation(Resource.kv, {
        record: {
          id: "kv:local",
          lastSyncDown: new Date().getTime(),
          lastSyncUp: new Date().getTime()
        },
        action: PersistenceActionType.MERGE
      });
      return true;
    } catch (e) {
      logger.error({ at: "flux.cloneDown", error: e });
      return false;
    } finally {
      if (!this.isExtensionEnvironment && !params?.isReconciliation) {
        dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
          message: `Sync completed.`,
          subMessage: "",
          isFinished: true
        });
      }
    }
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
      if (records.length > 0) {
        await this.performSync(SyncMethod.CLONE_UP, {
          resource,
          records
        });
      }
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
  async terminate() {
    const terminationResult = await this.persistence.terminate();
    logger.log({ at: "flux.terminate", terminationResult });
  }

  /**
   * Clears the indexed db and terminates the persistence connection.
   *
   * Use with caution as this wipes out entire data and can be detrimental in cases like Offline user with local only data.
   */
  async clear() {
    await this.terminate();
    await this.clearIndexedDb();
  }

  private async clearIndexedDb() {
    logger.log({ at: "flux.clearIndexedDb" });
    try {
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          await window.indexedDB.deleteDatabase(db.name);
        }
      }

      logger.log({ at: "flux.clearIndexedDb - completed" });
    } catch (e) {
      logger.error({ at: "flux.clearIndexedDb", error: e });
    }
  }

  /**
   * Exports the local database for backup.
   */
  async export() {
    logger.log({ at: "flux.export" });
    const resources = this.resolveSyncResources();
    let data: any = {};
    for (let resource of resources) {
      const records = await this.persistence.selectMany(resource as Resource);
      data[resource] = records;
    }
    return data;
  }
  /**
   * Imports a backup json or csv file into the local database.
   */
  async import(data: any) {
    logger.log({ at: "flux.import", data });
    for (let resource of Object.keys(data)) {
      try {
        if (resource === Resource.kv) {
          data[resource] = data[resource].filter(
            (x: any) => x.id !== "kv:local"
          );
        }
        logger.log({
          at: "flux.import - importing",
          resource,
          data: data[resource]
        });
        await this.persistence.mutation(resource as Resource, {
          records: data[resource],
          action:
            resource === Resource.kv || resource === Resource.link
              ? PersistenceActionType.INSERT
              : PersistenceActionType.BULK_INSERT
        });
        if (!(await determineIfOffline()) && data[resource].length > 0) {
          await this.performSync(SyncMethod.CLONE_UP, {
            resource,
            records: data[resource]
          });
        }
      } catch (e) {
        logger.error({
          at: "flux.import - error",
          resource,
          error: e
        });
      }
    }
    await this.loadInMemoryStores();
    return true;
  }
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
