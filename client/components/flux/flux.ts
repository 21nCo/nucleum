import { logger } from "@21n/components/debug/logger.client";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import {
  ResourceActionType,
  type IResource
} from "@21n/components/flux/resourceStores/resource.type";
import {
  type ILocal,
  type IPersistence,
  type ITable,
  PersistenceProvider
} from "@21n/persistence/persistence.type";
import { getDapId } from "@21n/persistence/persistence.utils";
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
  type IResourceSelectProperties,
  type IResourceStore
} from "@21n/types/data.type";
import { EmbedDataMessage } from "@21n/types/embedMessage.enum";
import { GlobalEvent } from "@21n/types/event.enum";
import { ExtensionEvent } from "@21n/types/extension.type";
import { resolveCurrentUserId } from "@21n/utils/account.utils";
import {
  dispatchCustomEvent,
  isExtensionEnvironment,
  getEnvVal
} from "@21n/utils/browser.utils";
import { postDataToParent } from "@21n/utils/embed.utils";
import {
  relayToContentScript,
  relayToSidePanel
} from "@21n/utils/extension.utils";
import { determineIfOffline, performApiCall } from "@21n/utils/network.utils";
import { wait } from "@21n/utils/time.utils";
import { interceptSurrealResponse } from "@21n/utils/utils";
import { SyncMethod } from "@21n/shared-types/sync.type";
import {
  generateRandomIdv2,
  generateSimpleRandomId
} from "@21n/shared-utils/crypto.utils";
import { reparse } from "@21n/shared-utils/json.utils";
import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
import { DataMapper } from "@21n/components/flux/dataMapper";
import {
  FluxMethod,
  type IDataMapper,
  type IFluxMethod,
  type IResourceTableConfig,
  type LoaderCallback
} from "@21n/components/flux/flux.type";
import {
  determineResourceType,
  isRecordId,
  removeDuplicatesFilter
} from "@21n/components/flux/resourceStores/resource.utils";

class Flux {
  static _instance: Flux | null = null;
  tables!: IResourceTableConfig[];
  loaderCallback: LoaderCallback | undefined;
  persistence!: IPersistence;
  dataMapper!: IDataMapper;
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
    persistence: IPersistence,
    params: {
      dapId: string;
      product: string;
      userId?: string;
      appVersion?: string;
      tables: IResourceTableConfig[];
      loaderCallback?: LoaderCallback;
    }
  ): Promise<number> {
    logger.log({ at: "flux.initialize", params });
    Flux._instance = new Flux();
    Flux._instance.isLocalMode = !params.userId;
    Flux._instance.persistence = persistence;
    Flux._instance.tables = params.tables;
    Flux._instance.loaderCallback = params.loaderCallback ?? undefined;
    Flux._instance.initializeDataMapper();
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
    product: string;
    userId?: string;
    appVersion?: string;
  }) {
    logger.log({ at: "flux.initializePersistence", params });

    let tables: ITable[] = this.tables.map((config) => ({
      name: config.name as Resource,
      indices: config.indices ?? ["id"],
      searchIndices: config.searchIndices
    }));
    tables = tables.concat([
      {
        name: Resource.kv,
        indices: ["id"]
      },
      {
        name: Resource.mutation,
        indices: ["id", "timestamp"]
      }
    ]);

    return this.persistence.initialize({
      ...params,
      isExtensionEnvironment: this.isExtensionEnvironment,
      tables
    });
  }

  private initializeDataMapper() {
    const encryptionFieldsMap: Record<string, string[]> = {};

    for (const config of this.tables) {
      if (config.encrypt) {
        encryptionFieldsMap[config.name] = config.encrypt;
      }
    }

    this.dataMapper = new DataMapper(encryptionFieldsMap);
  }

  async loadInMemoryStores(params?: {
    kvRecords?: string[];
    resources?: Resource[];
  }) {
    logger.log({ at: "flux.loadInMemoryStores", params });
    try {
      const data = await this.persistence.selectMany(Resource.kv);
      if (data) {
        data.forEach((record: any) => {
          if (
            params?.kvRecords &&
            !params.kvRecords.includes(record.id.toString())
          )
            return;
          const storeId = record.id.toString().replace("kv:", "");
          if (this.loaderCallback) this.loaderCallback(storeId, record);
        });
      }
      const inMemoryResources = this.tables
        .filter((t) => t.isInMemory)
        .map((t) => t.name as Resource);

      for (const resource of inMemoryResources) {
        if (params?.resources && !params.resources.includes(resource)) continue;
        const data = await this.persistence.selectMany(resource);
        if (data && Array.isArray(data)) {
          logger.log({
            at: "flux.loadInMemoryStores - loading resource store",
            id: resource,
            data
          });
          if (this.loaderCallback) this.loaderCallback(resource, data);
        }
      }
    } catch (e) {
      logger.error({ at: "flux.loadInMemoryStores", error: e });
    }
  }

  private async loadInMemoryResourceStore(resource: Resource) {
    logger.log({ at: "flux.loadInMemoryResourceStore", resource });
    const data = await this.persistence.selectMany(resource);
    if (this.loaderCallback) this.loaderCallback(resource, data);
  }

  /**
   * This method will be called on signup and database is bootstrapped.
   * This will persist all kv seed data on cloud.
   */
  async kvSeed(data: any) {
    logger.log({ at: "flux.kvSeed" });
    try {
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
   *
   * Removed seed timezone record - taken care by time::offset dbo function
   * @returns
   */
  async seed() {
    logger.log({ at: "flux.seed" });
    try {
    } catch (e) {
      logger.error({ at: "flux.seed", error: e });
    }
  }

  sendReloadRequestToEmbed() {
    postDataToParent(EmbedDataMessage.RELOAD, true);
  }

  async mutation<T extends IResource>(
    resource: Resource,
    params: IMutationParamsv2<T>,
    additionalParams: IMutationAdditionalParams = {}
  ) {
    let response;
    logger.log({
      at: "flux.mutation",
      resource,
      params: {
        ...params,
        action: params.action,
        recordCount:
          "records" in params ? params.records?.length ?? "NA" : "NA",
        record: "record" in params ? params.record : "NA"
      }
    });
    try {
      const config = this.tables.find((t) => t.name === resource);
      const isCloudOnly = config ? config.isRemoteOnly : true;
      if (!isCloudOnly || this.isLocalMode) {
        response = await this.persistence.mutation(resource, params);
      }
      let mutation: IMutation | undefined;
      if (
        !additionalParams?.isPreventCloudPersistence &&
        (!this.isLocalMode || this.isExtensionEnvironment || isCloudOnly)
      ) {
        mutation = await this.insertMutation(resource, params);
      }
      if (this.isExtensionEnvironment && mutation) {
        await wait(100);
        response = await this.syncForExtension(mutation);
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
        const isInMemory = config?.isInMemory ?? false;
        if (isInMemory) {
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
      throw e;
    }
    logger.log({
      at: "flux.mutation - result",
      resource,
      action: params.action,
      recordCount: "records" in params ? params.records?.length ?? "NA" : "NA",
      record: "record" in params ? params.record : "NA",
      response
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
    const mutationId = generateRandomIdv2();
    const userId = await resolveCurrentUserId();
    const mutation: IMutation = {
      id: mutationId,
      createdAt: new Date(),
      modifiedAt: new Date(),
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
        return params?.records.map((x) => x.id);
      case PersistenceActionType.BULK_MERGE:
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
    properties?: IResourceSelectProperties,
    params?: {
      signal?: AbortSignal;
    }
  ) {
    try {
      logger.log({ at: "flux.select", resourceId });

      if (params?.signal?.aborted) {
        throw new Error("Operation aborted");
      }

      const isOffline = await determineIfOffline();
      const resourceType = resourceId.toString().split(":")[0];
      const config = this.tables.find((t) => t.name === resourceType);
      const isCloudOnly = config?.isRemoteOnly ?? false;
      if (!this.isLocalMode && isCloudOnly && !isOffline) {
        return this.remoteRelay({
          method: FluxMethod.SELECT,
          args: {
            resourceId,
            properties: properties ?? { select: [] },
            signal: params?.signal
          }
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
    additionalParams?: { signal?: AbortSignal; isUseCloud?: boolean }
  ) {
    try {
      const debugResource: Resource[] = [];
      const randomId = generateSimpleRandomId();
      if (debugResource.includes(resource)) {
        console.time(`flux.selectMany - ${resource} - ${randomId}`);
        logger.debug({
          at: "flux.selectMany",
          randomId,
          resource,
          params,
          additionalParams
        });
      }

      if (additionalParams?.signal?.aborted) {
        throw new Error("Operation aborted");
      }

      const isOffline = await determineIfOffline();
      const config = this.tables.find((t) => t.name === resource);
      const isCloudOnly = config?.isRemoteOnly ?? false;
      if (
        !this.isLocalMode &&
        (isCloudOnly || additionalParams?.isUseCloud) &&
        !isOffline
      ) {
        const result = await this.remoteRelay({
          method: FluxMethod.SELECT_MANY,
          args: {
            resource,
            params: params,
            signal: additionalParams?.signal
          }
        });
        return interceptSurrealResponse(result, "flux.selectMany");
      }
      const result = await this.persistence.selectMany(
        resource,
        params,
        additionalParams?.signal
      );
      if (debugResource.includes(resource)) {
        logger.debug({
          at: "flux.selectMany - result",
          resource,
          params,
          result
        });
        console.timeEnd(`flux.selectMany - ${resource} - ${randomId}`);
      }
      return result;
    } catch (e) {
      if (e instanceof Error && e.message === "Operation aborted") {
        logger.log({ at: "flux.selectMany - aborted", e });
        throw e;
      } else {
        logger.error(
          {
            at: "flux.select",
            resource,
            params
          },
          e
        );
      }
    }
  }

  /**
   * @deprecated - use select instead
   * @param query
   * @param params
   * @returns
   */
  async selectByQuery(query: string, params?: any) {
    return this.persistence.query(query, params);
  }

  async kvMerge(storeId: string, data: any) {
    const record = {
      ...data,
      id: `kv:${storeId}`
    };
    logger.log({ at: "kvMerge", storeId, record });
    const result = await this.persistence.mutation(Resource.kv, {
      record,
      action: PersistenceActionType.MERGE
    });
    logger.log({ at: "kvMerge - result", storeId, record, result });
    if (!this.isLocalMode) {
      const mutation = await this.insertMutation(Resource.kv, {
        record,
        action: PersistenceActionType.MERGE
      });
      if (this.isExtensionEnvironment) {
        setTimeout(async () => {
          await this.syncForExtension(mutation);
        }, 100);
      }
    }
    return result;
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
        response = reparse(response);
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
          const countsRawData = response.slice(1)?.map((x) => x.result) ?? [];
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
      const result = await performApiCall("v2/account/relay", "POST", body);
      if (result?.ok) {
        const response = await result.json();
        logger.log({ at: "flux.remoteRelay", body, response });
        return [{ result: response }];
      }
    } catch (e) {
      logger.error({ at: "flux.remoteRelay", body, error: e });
    }
  }

  /**
   * For Extension Environment:
   * Sync up the local changes and from response - syncs down the changes from cloud.
   * @returns
   */
  async syncForExtension(mutation?: IMutation) {
    try {
      if (!mutation) return;
      const isOffline = await determineIfOffline();
      if (isOffline) {
        //TODO - user feedback that internet connection is required for sync to work
        console.log("offline detected - extension");
        return;
      }
      logger.log({
        at: "flux.syncForExtension",
        mutation,
        isExtensionEnvironment: this.isExtensionEnvironment
      });
      const local = await this.resolveLocal();
      const lastSyncDown =
        local?.lastSyncDown ?? new Date().getTime() - 1000 * 60 * 60 * 24;
      const dapId = await this.resolveDapId(local);
      let response = await this.performSync(SyncMethod.SYNC_UP, {
        mutations: [{ ...mutation, dapId }],
        lastSyncDown,
        resources: this.resolveSyncResources(),
        dapId
      });
      logger.log({
        at: "flux.syncForExtension - response",
        mutation,
        response
      });
      if (response?.syncDownData) {
        await this.processSyncDown(response.syncDownData, {
          src: "syncForExtension"
        });
      }
      return response;
    } catch (e) {
      logger.error({ at: "flux.syncForExtension", error: e });
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
      if (this.isSyncUpPending) {
        return;
      }
      this.isSyncUpPending = true;
      logger.log({
        at: "flux.sync",
        mutation,
        isExtensionEnvironment: this.isExtensionEnvironment
      });
      const local = await this.resolveLocal();
      if (!local) {
        //TODO - case when flux isn't responding or local is not present
        logger.error({ at: "flux.sync", error: "local not found" });
        dispatchCustomEvent(GlobalEvent.CUSTOM_ALERT, {
          error: "fluxerror",
          message: "Something went wrong. Please try again."
        });
        await this.persistence.reinitialize();
        this.sendReloadRequestToEmbed();
        this.isSyncUpPending = false;
        return;
      }
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
        const resources = this.resolveSyncResources();
        let totalSyncedMutations = 0;
        let maxIterations = 10;
        let iterations = 0;

        while (iterations < maxIterations) {
          iterations++;
          let { mutations } = await this.resolveItemsForSyncUp();
          if (!mutations || mutations.length === 0) {
            break;
          }

          logger.log({
            at: "flux.sync - batch",
            mutationsLength: mutations.length,
            iterations,
            maxIterations
          });

          const batchResponse = await this.performSync(SyncMethod.SYNC_UP, {
            mutations,
            lastSyncDown,
            resources,
            dapId
          });

          if (batchResponse && !batchResponse.response?.error) {
            const mutationIds = mutations.map((x) => x.id);
            await this.persistence.mutation(Resource.mutation, {
              recordIds: mutationIds,
              action: PersistenceActionType.BULK_DELETE
            });
            totalSyncedMutations += mutations.length;
            logger.debug({
              at: "flux.sync - completed mutations batch",
              mutationIds,
              batchSize: mutations.length,
              totalSynced: totalSyncedMutations
            });

            if (batchResponse.syncDownData) {
              response = batchResponse;
            }
          } else {
            logger.error({
              at: "flux.sync - batch failed",
              error: batchResponse?.response?.error
            });
            break;
          }
        }

        logger.log({
          at: "flux.sync - completed",
          totalSyncedMutations
        });
      }
      logger.log({ at: "flux.sync - response", mutation, response });
      if (response?.syncDownData) {
        await this.processSyncDown(response.syncDownData, { src: "sync" });
      }
      this.isSyncUpPending = false;
      return response;
    } catch (e: any) {
      this.isSyncUpPending = false;
      logger.error({ at: "flux.sync", error: e, message: e.message });
    }
  }

  async resolveItemsForSyncUp() {
    const local = await this.resolveLocal();
    if (!local) return { mutations: [] };
    const dapId = await this.resolveDapId(local);
    logger.log({
      at: "flux.resolveItemsForSyncUp",
      local,
      dapId
    });
    const limit = +(import.meta.env.VITE_SYNC_UP_LIMIT ?? 20);
    let mutations: IMutation[] = await this.persistence.selectMany(
      Resource.mutation,
      {
        filters: {
          timestamp: {
            greaterThan: 1754491035000
          }
        },
        limit,
        orderBy: {
          timestamp: "asc"
        }
      }
    );
    mutations = mutations.map((x) => ({ ...x, dapId }));
    logger.log({ at: "flux.resolveItemsForSyncUp", mutations });
    return {
      mutations
    };
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
  async syncDown(params?: {
    isInitialSyncdown?: boolean;
    src?: string;
    isReturnCount?: boolean;
  }) {
    logger.log({ at: "flux.syncDown", params });
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
        dapId,
        isReturnCount: params?.isReturnCount
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
    params?: { isInitialSyncdown?: boolean; src?: string }
  ) {
    logger.log({ at: "flux.processSyncDown", ...params });
    if (!response) {
      return;
    }
    if (
      typeof response === "number" ||
      (Array.isArray(response) && response.length === 0) ||
      (typeof response === "object" &&
        response !== null &&
        !Array.isArray(response) &&
        !("records" in response))
    ) {
      console.log("large sync down detected: ", response);
      await this.reconcile({ reCloneAll: true });
      return;
    }

    const syncRecords: any[] = response?.records;
    const deletedRecords: any[] = response?.deleted;
    if (deletedRecords && deletedRecords.length > 0) {
      await this.processDeletedRecords(deletedRecords);
    }
    logger.log({ at: "processSyncDown", syncRecords });
    if (!Array.isArray(syncRecords) || syncRecords.length === 0) return;
    let data: { resource: Resource; records: any[] }[] = [];
    const recordsByResource = new Map<Resource, any[]>();

    for (let record of syncRecords) {
      const resourceType = determineResourceType(record.id);
      if (!resourceType || resourceType === Resource.unknown) continue;

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

    recordsByResource.clear();

    for (let { resource, records } of data) {
      this.propagateSyncStatus(resource);
      records = this.dataMapper.parse(resource, records);
      const mutationResult = await this.persistence.mutation(
        resource as Resource,
        {
          records,
          action: PersistenceActionType.INSERT
        }
      );
      this.propagateSyncStatus(resource, true);
    }
    if (!params?.isInitialSyncdown) {
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
    if (!this.isExtensionEnvironment && !params?.isInitialSyncdown) {
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
      delteRecordsByResource.clear();
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
      isFirstInitialLoad?: boolean;
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
        await this.processCloneDown(resource, records, {
          isReconciliation: params?.isReconciliation,
          isFirstInitialLoad: params?.isFirstInitialLoad
        });
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

  private async processCloneDown(
    resource: Resource,
    records: any,
    params: {
      isReconciliation?: boolean;
      isFirstInitialLoad?: boolean;
    }
  ) {
    try {
      console.time(`cloneDown - ${resource}`);
      if (!this.isExtensionEnvironment && resource !== Resource.kv) {
        // dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
        //   subMessage: `Syncing ${resource}s...`
        // });
      }
      if (resource === Resource.kv) {
        records = records.filter(
          (x: any) => x.id && !x.id?.toString()?.includes("local")
        );
      } else if (resource === Resource.link) {
        records = records
          .map((x: any) => ({
            ...x,
            in: x.in.toString(),
            out: x.out.toString()
          }))
          .filter((x: any) => isRecordId(x.in) && isRecordId(x.out))
          .filter(removeDuplicatesFilter);
      }
      records = this.dataMapper.parse(resource, records);
      let mutationResult;
      try {
        mutationResult = await this.persistence.mutation(
          resource as Resource,
          {
            records,
            action:
              params?.isReconciliation ||
              resource === Resource.kv ||
              resource === Resource.link
                ? PersistenceActionType.INSERT
                : PersistenceActionType.BULK_INSERT,
            isSkipFlexSearchIndexing: params?.isFirstInitialLoad
          } as any
        );
      } catch (e) {
        logger.error({
          at: "flux.cloneDown - error",
          resource,
          error: e
        });
      }
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
            action: PersistenceActionType.INSERT,
            isSkipFlexSearchIndexing: params?.isFirstInitialLoad
          } as any
        );
        logger.log({
          at: "flux.cloneDown - fallbackResult",
          resource,
          fallbackResult
        });
      }
      console.timeEnd(`cloneDown - ${resource}`);
    } catch (e) {
      logger.error({ at: "flux.processCloneDown", error: e });
      console.timeEnd(`cloneDown - ${resource}`);
    }
  }

  private async cloneDownV2(
    resources: Resource[],
    params?: {
      isReconciliation?: boolean;
      limit?: number;
      isFirstInitialLoad?: boolean;
    }
  ): Promise<{ cursors?: any } | undefined> {
    logger.log({ at: "flux.cloneDownv2", resources });
    try {
      if (!resources || resources.length === 0 || (await determineIfOffline()))
        return;
      const _limit = params?.limit ?? this.cloneDownLimit;
      const result = await this.performSync(SyncMethod.CLONE_DOWN_V2, {
        resources,
        limit: _limit,
        isExtension: this.isExtensionEnvironment
      });
      for (let [index, resource] of resources.entries()) {
        const records = result.data[resource] ?? result.data[index];
        if (!records || !isValidArrayWithData(records)) continue;
        await this.processCloneDown(resource, records, {
          isReconciliation: params?.isReconciliation,
          isFirstInitialLoad: params?.isFirstInitialLoad
        });
      }
      return result;
    } catch (e) {
      logger.error({ at: "flux.cloneDownv2", error: e });
    }
  }

  /**
   * Initializes essential data for cloud user. This is called for a fresh login of a returning cloud user.
   * 1. Clones down all finite resources
   * 2. Clones down most recent non finite resources so that paginate will carry out rest of the clone.
   */
  async initializeEssentialDataForCloudUser() {
    try {
      logger.info({ at: "flux.initializeEssentialDataForCloudUser" });
      this.propagateSyncStatus(Resource.everything);
      const resources = this.resolveFIRResources();
      const result = await this.cloneDown(resources, {
        limit: 1000,
        isFirstInitialLoad: true
      });
      if (!result) return false;
      if (result.paginateResources) {
        await this.paginateResources(result.paginateResources, undefined, true);
      }
      const ifrResources = this.resolveIFRBootResources();
      const ifrResult = await this.cloneDown(ifrResources, {
        limit: 100,
        isFirstInitialLoad: true
      });
      await this.afterInitialize();
      return {
        finiteCloneResult: result,
        ifrCloneResult: ifrResult,
        paginateResources: result?.paginateResources,
        isFirstInitialLoad: true
      };
    } catch (e) {
      logger.error({ at: "flux.cloneDownEssentials", error: e });
      this.propagateSyncStatus(Resource.everything, true);
    }
  }

  async initializeEssentialDataForCloudUserV2() {
    try {
      logger.info({ at: "flux.initializeEssentialDataForCloudUserV2" });
      this.propagateSyncStatus(Resource.everything);
      const resources = this.resolveFIRResources();
      const result = await this.cloneDownV2(resources, {
        limit: 1000,
        isFirstInitialLoad: true
      });
      if (!result) return false;
      if (result.cursors) {
        await this.paginateResourcesV2(result.cursors, true);
      }
      const ifrResources = this.resolveIFRBootResources();
      const ifrResult = await this.cloneDownV2(ifrResources, {
        limit: 100,
        isFirstInitialLoad: true
      });
      await this.afterInitialize();
      return {
        ...ifrResult,
        isFirstInitialLoad: true
      };
    } catch (e) {
      logger.error({ at: "flux.cloneDownEssentials", error: e });
      this.propagateSyncStatus(Resource.everything, true);
    }
  }

  private async afterInitialize() {
    await this.loadInMemoryStores();
    await this.persistence.mutation(Resource.kv, {
      record: {
        id: "kv:local",
        lastSyncDown: new Date().getTime()
      },
      action: PersistenceActionType.MERGE
    });
    this.propagateSyncStatus(Resource.everything, true);
  }

  async index() {
    if (
      typeof (this.persistence as any).triggerBackgroundIndexing === "function"
    ) {
      logger.info({
        at: "flux.index - triggering background indexing"
      });
      (this.persistence as any)
        .triggerBackgroundIndexing(true)
        .catch((error: any) => {
          logger.error({
            at: "flux.index - background indexing error",
            error
          });
        });
    }
  }

  /**
   * Performs initial sync down for a returning cloud user on app load.
   */
  async initialSyncDown() {
    try {
      this.propagateSyncStatus(Resource.everything);
      const result = await this.syncDown({
        isInitialSyncdown: true,
        isReturnCount: true
      });
      await this.loadInMemoryStores();
      this.propagateSyncStatus(Resource.everything, true);
      return result;
    } catch (e) {
      logger.error({ at: "flux.initialSyncDown", error: e });
      this.propagateSyncStatus(Resource.everything, true);
    }
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
          logger.info({
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
      logger.info({
        at: "flux.reconcile - reconciliation started",
        resourcesForReconciliation
      });
      const result = await this.cloneDownV2(resourcesForReconciliation, {
        isReconciliation: true
      });
      if (result?.cursors) {
        await this.paginateResourcesV2(result.cursors);
      }
      if (!params?.reCloneAll) {
        this.performSync(SyncMethod.RECONCILE, {
          resources: resourcesForReconciliation
        });
      }
    }
  }

  propagateSyncStatus(resource: Resource, isFinish?: boolean) {
    if (this.isExtensionEnvironment) return;
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

  async paginateResources(
    resources: Resource[],
    offset?: number,
    isFirstInitialLoad?: boolean
  ) {
    for (let resource of resources) {
      this.propagateSyncStatus(resource);
      await this.paginateResource(
        resource,
        offset !== undefined ? offset : this.cloneDownLimit,
        this.cloneDownLimit,
        isFirstInitialLoad
      );
      this.propagateSyncStatus(resource, true);
    }
  }

  async paginateResource(
    resource: Resource,
    offset: number,
    limit: number,
    isFirstInitialLoad?: boolean
  ) {
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
      let mutationResult;
      try {
        mutationResult = await this.persistence.mutation(
          resource as Resource,
          {
            records,
            action:
              resource === Resource.kv || resource === Resource.link
                ? PersistenceActionType.INSERT
                : PersistenceActionType.BULK_INSERT,
            isSkipFlexSearchIndexing: isFirstInitialLoad
          } as any
        );
      } catch (e) {
        logger.error({
          at: "flux.paginateResource - error",
          resource,
          error: e
        });
      }
      if (!mutationResult) {
        await this.persistence.mutation(
          resource as Resource,
          {
            records,
            action: PersistenceActionType.INSERT,
            isSkipFlexSearchIndexing: isFirstInitialLoad
          } as any
        );
      }
      if (records.length === limit) {
        await this.paginateResource(
          resource,
          offset + limit,
          limit,
          isFirstInitialLoad
        );
      }
    }
  }

  async paginateResourcesV2(
    cursors: { [key: string]: string },
    isFirstInitialLoad?: boolean
  ) {
    for (let resource of Object.keys(cursors)) {
      const cursor = cursors[resource];
      if (!cursor) continue;
      this.propagateSyncStatus(resource as Resource);
      await this.paginateResourceV2(
        resource as Resource,
        cursor,
        isFirstInitialLoad
      );
      this.propagateSyncStatus(resource as Resource, true);
    }
  }

  async paginateResourceV2(
    resource: Resource,
    cursor: string,
    isFirstInitialLoad?: boolean
  ) {
    if (!cursor) return;
    this.propagateSyncStatus(resource);
    const result = await this.performSync(SyncMethod.CLONE_DOWN_PAGINATE_V2, {
      resource,
      isExtension: this.isExtensionEnvironment,
      cursor
    });

    if (isValidArrayWithData(result.data)) {
      let records = result.data;
      records = this.dataMapper.parse(resource, records);
      let mutationResult;
      try {
        mutationResult = await this.persistence.mutation(
          resource as Resource,
          {
            records,
            action:
              resource === Resource.kv || resource === Resource.link
                ? PersistenceActionType.INSERT
                : PersistenceActionType.BULK_INSERT,
            isSkipFlexSearchIndexing: isFirstInitialLoad
          } as any
        );
      } catch (e) {
        logger.error({
          at: "flux.paginateResourceV2 - error",
          resource,
          error: e
        });
      }
      if (!mutationResult) {
        await this.persistence.mutation(
          resource as Resource,
          {
            records,
            action: PersistenceActionType.INSERT,
            isSkipFlexSearchIndexing: isFirstInitialLoad
          } as any
        );
      }
      if (result.nextCursor) {
        await this.paginateResourceV2(
          resource,
          result.nextCursor,
          isFirstInitialLoad
        );
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
    const remoteOnlyResources = this.tables
      .filter((x) => x.isRemoteOnly)
      .map((x) => x.name as Resource);
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
    return this.tables
      .filter((x) => !x.isRemoteOnly)
      .map((t) => t.name as Resource)
      .filter(Boolean)
      .concat(Resource.kv);
  }

  private resolveFIRResources(): Resource[] {
    return this.tables
      .filter(
        (t) =>
          !t.isRemoteOnly && (!t.dataType || t.dataType === StoreDataType.FIR)
      )
      .filter(Boolean)
      .map((t) => t.name as Resource)
      .concat(Resource.kv);
  }
  private resolveIFRBootResources(): Resource[] {
    return this.tables
      .filter(
        (t) =>
          !t.isRemoteOnly && (!t.dataType || t.dataType === StoreDataType.IFR)
      )
      .filter(Boolean)
      .map((t) => t.name as Resource);
  }

  async reinitializeIfRequired() {
    const local = await this.resolveLocal();
    if (!local) {
      logger.info({
        at: "flux.reinitializeIfRequired - local not found - reinitializing"
      });
      await this.persistence.reinitialize();
    }
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
        let mutationResult;
        try {
          mutationResult = await this.persistence.mutation(
            resource as Resource,
            {
              records: data[resource],
              action:
                resource === Resource.kv || resource === Resource.link
                  ? PersistenceActionType.INSERT
                  : PersistenceActionType.BULK_INSERT
            }
          );
        } catch (error) {
          logger.error({
            at: "flux.import - bulkInsert failed, falling back",
            resource,
            error
          });
        }
        if (!mutationResult) {
          await this.persistence.mutation(resource as Resource, {
            records: data[resource],
            action: PersistenceActionType.INSERT
          });
        }
        if (
          !this.isLocalMode &&
          !(await determineIfOffline()) &&
          data[resource].length > 0
        ) {
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
    if (!this.isExtensionEnvironment) {
      dispatchCustomEvent(GlobalEvent.SYNC_DOWN);
    }
    return true;
  }
}

export let flux = Flux._instance as any as Flux;

export async function initFlux(
  persistence: IPersistence,
  params: {
    tables: IResourceTableConfig[];
    dapId: string;
    product: string;
    userId?: string;
    appVersion?: string;
    /**
     * Will not be present in extension environment
     */
    loaderCallback?: LoaderCallback;
  }
) {
  logger.log({ at: "initFlux", persistence, params });
  const result = await Flux.initialize(persistence, params);
  flux = Flux._instance as any as Flux;
  return result;
}
