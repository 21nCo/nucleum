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
  type IMutationAdditionalParams,
  SearchType
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
  isExtensionEnvironment,
  getEnvVal
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
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { FluxMethod, type IFluxMethod } from "./flux.type";
import { tacoWorker } from "$lib/client/products/memotron/memotron.utils";
import { TacoActions } from "$lib/client/products/memotron/taco/taco.types";
import { interceptSurrealResponse } from "$lib/client/utils/utils";
import { determineResourceType } from "./resourceStores/resource.utils";

class Flux {
  static _instance: Flux | null = null;
  stores: IStore[] = [];
  remoteOnlyStores: IStore[] = [];
  provider!: PersistenceProvider;
  persistence!: IPersistence;
  // syncer!: ISyncHandler;
  remote!: ISurrealDatabase;
  private isLocalMode: boolean = false;
  private isExtensionEnvironment: boolean = false;
  private isSyncDownPending: boolean = false;
  private isSyncUpPending: boolean = false;
  private constructor() {
    this.isExtensionEnvironment = isExtensionEnvironment();
  }
  private readonly cloneDownLimit =
    getEnvVal("CLONE_DOWN_LIMIT", "number") ?? 500;

  static initialize(
    stores: IStore[],
    provider: PersistenceProvider,
    persistence: IPersistence,
    params: {
      dapId: string;
      userId?: string;
      appVersion?: string;
      remoteOnlyStores?: IStore[];
    }
  ): Promise<number> {
    logger.log({ at: "flux.initialize", stores, params });
    Flux._instance = new Flux();
    Flux._instance.provider = provider;
    Flux._instance.isLocalMode = !params.userId;
    Flux._instance.persistence = persistence;
    Flux._instance.stores = stores;
    Flux._instance.remoteOnlyStores = params.remoteOnlyStores ?? [];
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

  async loadInMemoryStores(params?: {
    kvRecords?: string[];
    resources?: Resource[];
  }) {
    logger.debug({ at: "flux.loadInMemoryStores", params });
    try {
      let kvStores = this.stores.filter(
        (x) => x.dataType === StoreDataType.KVO
      );
      const data = await this.persistence.selectMany(Resource.kv);
      if (!data) return;
      data.forEach((record: any) => {
        if (
          params?.kvRecords &&
          !params.kvRecords.includes(record.id.toString())
        )
          return;
        const store = kvStores.find(
          (x) => "kv:" + x.id === record.id.toString()
        );
        if (!store?.loader) return;
        store.loader(record);
      });
      let inMemoryResouceStores = this.stores.filter((x) => x.isInMemory);
      if (!inMemoryResouceStores) return;
      for (const store of inMemoryResouceStores) {
        if (
          params?.resources &&
          !params.resources.includes(store.id as Resource)
        )
          continue;
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
      if (!additionalParams?.isCloudOnlyResource || this.isLocalMode) {
        response = await this.persistence.mutation(resource, params);
      }
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
      case PersistenceActionType.BULK_DELETE:
        return params?.recordIds;
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
      case PersistenceActionType.BULK_MERGE:
        return ResourceActionType.EDIT;
      case PersistenceActionType.DELETE:
      case PersistenceActionType.BULK_DELETE:
        return ResourceActionType.DELETE;
      default:
        return ResourceActionType.EDIT;
    }
  }

  async select(
    resourceId: IRecordId,
    properties?: string[],
    additionalParams?: { isCloudOnlyResource?: boolean }
  ) {
    try {
      logger.log({ at: "flux.select", resourceId });
      const isOffline = await determineIfOffline();
      if (
        !this.isLocalMode &&
        additionalParams?.isCloudOnlyResource &&
        !isOffline
      ) {
        return this.remoteRelay({
          method: FluxMethod.SELECT,
          args: { resourceId, properties }
        });
      }
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

  async selectMany(
    resource: Resource,
    params?: IResourceSelectParams,
    additionalParams?: { isCloudOnlyResource?: boolean }
  ) {
    try {
      logger.log({
        at: "flux.selectMany",
        resource,
        params,
        additionalParams
      });
      const isOffline = await determineIfOffline();
      if (
        !this.isLocalMode &&
        additionalParams?.isCloudOnlyResource &&
        !isOffline
      ) {
        if (
          params?.searchType === SearchType.SEMANTIC &&
          params?.search?.query
        ) {
          let queryEmbedding: Float32Array[] | undefined = undefined;
          // queryEmbedding = await FeatureExtractor.generateVectorEmbeddings(
          //   params.search.query
          // );
          tacoWorker.postMessage({
            action: TacoActions.GET_EMBEDDINGS,
            params: {
              text: params.search.query
            }
          });
          const result: any = await new Promise((resolve, reject) => {
            tacoWorker.onmessage = (e) => {
              resolve(e.data);
            };
          });
          queryEmbedding = result?.data;
          params.properties = [
            ...(params?.properties ?? []),
            `vector::similarity::cosine(embedding,[${queryEmbedding}]) AS dist`
          ];
          params.search.queryEmbedding = queryEmbedding;
        }
        const result = await this.remoteRelay({
          method: FluxMethod.SELECT_MANY,
          args: { resource, params }
        });
        return interceptSurrealResponse(result, "flux.selectMany");
      }
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
      const result = await performApiCall(`v2/sync/${method}`, "POST", data);
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
        if (response && response?.length > 0) {
          const syncDownData = response[response.length - 1];
          if (syncDownData?.result) {
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

  async remoteRelay(body: IFluxMethod) {
    try {
      const result = await performApiCall(`relay`, "POST", body);
      if (result?.ok) {
        const response = await result.json();
        logger.log({ at: "flux.remoteRelay", body, response });
        return response;
      }
    } catch (e) {
      logger.error({ at: "flux.remoteRelay", body, error: e });
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
      if (this.isSyncUpPending) return;
      this.isSyncUpPending = true;
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
        if (response && !response.response?.error) {
          await this.persistence.mutation(Resource.kv, {
            record: {
              id: "kv:local",
              lastSyncUp: mutations[mutations.length - 1].timestamp
            },
            action: PersistenceActionType.MERGE
          });
        }
      }
      logger.log({ at: "flux.sync - response", mutation, response });
      if (response?.syncDownData) {
        await this.processSyncDown(response.syncDownData);
      }
      return response;
    } catch (e) {
      logger.error({ at: "flux.sync", error: e });
    } finally {
      this.isSyncUpPending = false;
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
        limit: 100,
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
  async syncDown(params?: { isPreventInMemoryStoreLoad?: boolean }) {
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
      const result = await this.performSync(SyncMethod.SYNC_DOWN, {
        lastSyncDown,
        resources,
        dapId
      });
      this.isSyncDownPending = false;
      logger.log({ at: "flux.syncDown - result", result });
      if (result.syncDownData) {
        await this.processSyncDown(result.syncDownData, params);
      }
      return result;
    } catch (e) {
      logger.error({ at: "flux.syncDown", error: e });
    } finally {
      this.isSyncDownPending = false;
    }
  }

  private async processSyncDown(
    response: any,
    params?: { isPreventInMemoryStoreLoad?: boolean }
  ) {
    if (!response) {
      return;
    }
    if (typeof response === "number") {
      console.log("large sync down detected: ", response);
      await this.reconcile({ reCloneAll: true });
      return;
    }

    const syncRecords: any[] = response?.records;
    const deletedRecords: any[] = response?.deleted;
    if (deletedRecords && deletedRecords.length > 0) {
      await this.processDeletedRecords(deletedRecords);
    }
    logger.log({ at: "processSyncDown", mutations: syncRecords });
    if (!Array.isArray(syncRecords) || syncRecords.length === 0) return;
    let data: { resource: Resource; records: any[] }[] = [];
    const recordsByResource = new Map<Resource, any[]>();

    for (let record of syncRecords) {
      const resourceType = determineResourceType(record.id);
      if (!resourceType) continue;

      if (!recordsByResource.has(resourceType)) {
        recordsByResource.set(resourceType, []);
      }
      recordsByResource.get(resourceType)!.push(record);
    }

    data = Array.from(recordsByResource.entries()).map(
      ([resource, records]) => ({
        resource,
        records
      })
    );

    for (let { resource, records } of data) {
      this.propagateSyncStatus(resource);
      const mutationResult = await this.persistence.mutation(
        resource as Resource,
        {
          records,
          action: PersistenceActionType.INSERT
        }
      );
      this.propagateSyncStatus(resource, true);
    }
    if (!params?.isPreventInMemoryStoreLoad) {
      logger.log({
        at: "flux.syncDown - loading in memory stores",
        mutations: syncRecords
      });
      const kvData = data.find((x) => x.resource === Resource.kv);
      await this.loadInMemoryStores({
        kvRecords: kvData?.records.map((x) => x.id),
        resources: data.map((x) => x.resource)
      });
    }
    if (response.latestTimestamp.timestamp) {
      await this.persistence.mutation(Resource.kv, {
        record: {
          id: "kv:local",
          lastSyncDown: response.latestTimestamp.timestamp
        },
        action: PersistenceActionType.MERGE
      });
    }
    if (!this.isExtensionEnvironment) {
      dispatchCustomEvent(GlobalEvent.SYNC_DOWN);
    }
    return syncRecords;
  }
  private async processDeletedRecords(deletedRecords: any[]) {
    try {
      const delteRecordsByResource = new Map<Resource, any[]>();
      for (let record of deletedRecords) {
        if (!record.resource) continue;
        if (!delteRecordsByResource.has(record.resource)) {
          delteRecordsByResource.set(record.resource, []);
        }
        delteRecordsByResource
          .get(record.resource)!
          .push(
            Array.isArray(record.resourceId)
              ? record.resourceId
              : [record.resourceId]
          );
      }
      for (let [resource, ids] of delteRecordsByResource) {
        await this.persistence.mutation(resource, {
          action: PersistenceActionType.BULK_DELETE,
          recordIds: ids
        });
      }
    } catch (e) {
      logger.error({ at: "flux.processDeletedRecords", error: e });
    }
  }

  /**
   * Clones down from cloud to local.
   */
  private async cloneDown(
    resources: Resource[],
    params?: {
      isReconciliation?: boolean;
      limit?: number;
    }
  ): Promise<{ paginateResources?: Resource[] } | undefined> {
    logger.log({ at: "flux.cloneDown", resources });
    try {
      if (!resources || resources.length === 0 || (await determineIfOffline()))
        return;
      const _limit = params?.limit ?? this.cloneDownLimit;
      const result = await this.performSync(SyncMethod.CLONE_DOWN, {
        resources,
        limit: _limit,
        isExtension: this.isExtensionEnvironment
      });
      let needsPagination: Resource[] = [];
      for (let i = 0; i < result.length; i++) {
        const resource = resources[i];
        const resourceResponse = result[i];
        if (
          !resourceResponse?.result ||
          !isValidArrayWithData(resourceResponse.result)
        )
          continue;
        let records = resourceResponse.result;
        if (records.length === _limit) {
          needsPagination.push(resource);
        }
        console.time(`cloneDown - ${resource}`);
        if (!this.isExtensionEnvironment && resource !== Resource.kv) {
          // dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
          //   subMessage: `Syncing ${resource}s...`
          // });
        }
        if (resource === Resource.kv) {
          records = records.filter(
            (x: any) => !x.id.toString().includes("local")
          );
        }
        const mutationResult = await this.persistence.mutation(
          resource as Resource,
          {
            records,
            action:
              params?.isReconciliation ||
              resource === Resource.kv ||
              resource === Resource.link
                ? PersistenceActionType.INSERT
                : PersistenceActionType.BULK_INSERT
          }
        );
        logger.log({
          at: "flux.cloneDown - result",
          resource,
          records,
          mutationResult
        });
        if (!mutationResult) {
          const fallbackResult = await this.persistence.mutation(
            resource as Resource,
            {
              records,
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
      console.log("needsPagination", needsPagination);
      return { paginateResources: needsPagination };
    } catch (e) {
      logger.error({ at: "flux.cloneDown", error: e });
    } finally {
      if (!this.isExtensionEnvironment && !params?.isReconciliation) {
        // dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
        //   message: `Sync completed.`,
        //   subMessage: "",
        //   isFinished: true
        // });
      }
    }
  }

  /**
   * Initializes essential data for cloud user. This is called for a fresh login of a returning cloud user.
   * 1. Clones down all finite resources
   * 2. Clones down most recent non finite resources so that paginate will carry out rest of the clone.
   */
  async initializeEssentialDataForCloudUser() {
    try {
      const resources = this.resolveFIRResources();
      const result = await this.cloneDown(resources, {
        limit: 1000
      });
      if (!result) return false;
      if (result.paginateResources) {
        await this.paginateResources(result.paginateResources);
      }
      const ifrResources = this.resolveIFRBootResources();
      const ifrResult = await this.cloneDown(ifrResources, {
        limit: 100
      });
      await this.loadInMemoryStores();
      await this.persistence.mutation(Resource.kv, {
        record: {
          id: "kv:local",
          lastSyncDown: new Date().getTime(),
          lastSyncUp: new Date().getTime()
        },
        action: PersistenceActionType.MERGE
      });
      return {
        finiteCloneResult: result,
        ifrCloneResult: ifrResult
      };
    } catch (e) {
      logger.error({ at: "flux.cloneDownEssentials", error: e });
    }
  }

  /**
   * Performs initial sync down for a returning cloud user on app load.
   */
  async initialSyncDown() {
    const result = await this.syncDown({ isPreventInMemoryStoreLoad: true });
    await this.loadInMemoryStores();
    return result;
  }

  /**
   * Compares resource counts from cloud and local and clones down missing resources.
   * @param counts - resource counts from cloud
   */
  async reconcile(params?: { counts?: any; reCloneAll?: boolean }) {
    const resources = this.resolveSyncResources();
    let resourcesForReconciliation = [];
    if (params?.reCloneAll) {
      resourcesForReconciliation = [...resources];
    } else {
      for (let resource of resources) {
        const localCount = (
          await this.persistence.selectMany(resource as Resource)
        ).length;
        const cloudCount = params?.counts?.[resource];
        if (localCount < cloudCount) {
          resourcesForReconciliation.push(resource);
          logger.debug({
            at: "flux.reconcile - resource with miss sync",
            resource,
            localCount,
            cloudCount
          });
        }
      }
    }
    logger.log({
      at: "flux.reconcile - resourcesForReconciliation",
      resourcesForReconciliation
    });
    if (resourcesForReconciliation.length > 0) {
      const result = await this.cloneDown(resourcesForReconciliation, {
        isReconciliation: true
      });
      if (result?.paginateResources) {
        await this.paginateResources(result.paginateResources);
      }
      if (!params?.reCloneAll) {
        this.performSync(SyncMethod.RECONCILE, {
          resources: resourcesForReconciliation
        });
      }
    }
  }

  propagateSyncStatus(resource: Resource, isFinish?: boolean) {
    let status = "";
    if (isFinish) {
      status = `${resource}:finished`;
    } else {
      status = `${resource}:started`;
    }
    const elements = document.querySelectorAll(`[data-syncfeedback="true"]`);
    if (elements) {
      for (let element of elements) {
        element.setAttribute("data-syncstatus", status);
      }
    }
  }

  async paginateResources(resources: Resource[], offset?: number) {
    for (let resource of resources) {
      this.propagateSyncStatus(resource);
      await this.paginateResource(
        resource,
        offset !== undefined ? offset : this.cloneDownLimit,
        this.cloneDownLimit
      );
      this.propagateSyncStatus(resource, true);
    }
  }
  async paginateResource(resource: Resource, offset: number, limit: number) {
    this.propagateSyncStatus(resource);
    const result = await this.performSync(SyncMethod.CLONE_DOWN_PAGINATE, {
      resource,
      isExtension: this.isExtensionEnvironment,
      offset,
      limit
    });
    console.log("paginateResource - result", resource, offset);
    if (
      isValidArrayWithData(result) &&
      isValidArrayWithData(result[0].result)
    ) {
      const records = result[0].result;
      const mutationResult = await this.persistence.mutation(
        resource as Resource,
        {
          records,
          action:
            resource === Resource.kv || resource === Resource.link
              ? PersistenceActionType.INSERT
              : PersistenceActionType.BULK_INSERT
        }
      );
      if (!mutationResult) {
        await this.persistence.mutation(resource as Resource, {
          records,
          action: PersistenceActionType.INSERT
        });
      }
      if (records.length === limit) {
        await this.paginateResource(resource, offset + limit, limit);
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
    const remoteOnlyResources = this.remoteOnlyStores.map((x) => x.id);
    const _all = [...resources, ...remoteOnlyResources];
    for (let resource of _all) {
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
        .filter(
          (x) =>
            x.dataType === StoreDataType.IFR || x.dataType === StoreDataType.FIR
        )
        .map((x) => x.id) ?? [])
    ] as Resource[];
    return resources;
  }

  private resolveFIRResources(): Resource[] {
    const resources = [
      Resource.kv,
      ...(this.stores
        .filter((x) => x.dataType === StoreDataType.FIR)
        .map((x) => x.id) ?? [])
    ] as Resource[];
    return resources;
  }
  private resolveIFRBootResources(): Resource[] {
    const resources = [
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
    remoteOnlyStores?: IStore[];
  }
) {
  logger.log({ at: "initFlux", stores, provider, persistence, params });
  const result = await Flux.initialize(stores, provider, persistence, params);
  flux = Flux._instance as any as Flux;
  return result;
}
