import type { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import type {
  IMetaResource,
  IResource
} from "@21n/components/flux/resourceStores/resource.type";
import type {
  IMutationParamsv2,
  IRecordId,
  IResourceSelectParams,
  IResourceSelectProperties
} from "@21n/types/data.type";

export enum ClientStorageKey {
  ENV = "env",
  PRODUCT = "product",
  IS_EXTENSION_LOGIN = "isExtensionLogin",
  EMBED_OAUTH = "embedOAuth",
  APP_DATA = "appData",
  STOKEN = "stoken",
  USER = "user",
  AUTHFN_TOKEN = "authfnToken",
  AUTHFN_WIDGET_TOKEN = "authfnWidgetToken",
  REGION = "region",
  USER_REGION_MAP = "userRegionMap",
  USER_INFO = "userInfo",
  USER_PLAN = "userPlan",
  /**
   * @deprecated - use userId instead
   */
  GUEST = "guest",
  SPACE_IN_CONTEXT = "spaceInContext",
  OFFLINE_SESSION_ID = "offlineSessionId",
  /**
   * Device access point id. This id will be unique for each access point on a given device. Ex: different broswer logins, macOS app login etc.
   *
   * This is used to determine the need for cloning cloud db to local db if logged in from different access points.
   *
   */
  DAP_ID = "dapId",

  INTERCOM_ID = "intercomId",
  OFFLINE_MODE = "offlineMode",
  DATAFN_OFFLINABILITY = "datafnOfflinability",
  DATAFN_E2EE_SETTINGS = "datafnE2eeSettings",
  DATAFN_E2EE_LOCAL_KEYS = "datafnE2eeLocalKeys",
  LEGACY_LOCAL_DATA_RECOVERY = "legacyLocalDataRecovery",
  LOW_DATA_MODE = "lowDataMode",
  /**
   * Clipper extension toolbar state for guest users.
   */
  GUEST_TOOLBAR_STATE = "guestToolbarState",
  /**
   * Tracks which fallback functions have been run to prevent re-execution
   */
  FALLBACKS_RUN_STATUS = "fallbacksRunStatus",
  /**
   * Used to store recent items for the clipper extension.
   */
  RECENTS = "recents",
  /**
   * Used to track the bootup status of the extension.
   */
  EXTENSION_BOOTUP = "extensionBootup",
  LAST_INDEXED_AT = "lastIndexedAt",
  TABLES = "tables"
}

export interface IPersistence {
  /**
   *
   * @param userId
   * @param params
   * @returns 0 if no database is present locally for the given userId, 1 if a database is present for the given id but is not an offline session earlier, 2 if the database is present and was used as offline session earlier. Returns -1 for any errors
   */
  initialize(params: IPersistenceInitParams): Promise<number>;

  reinitialize(): Promise<boolean>;

  terminate(): Promise<boolean>;

  mutation<T extends IResource | IMetaResource>(
    resource: Resource,
    params: IMutationParamsv2<T>
  ): Promise<any> | undefined;

  query(query: string, params: any): Promise<any> | undefined;

  selectMany(
    resource: Resource,
    params?: IResourceSelectParams,
    signal?: AbortSignal
  ): Promise<any> | undefined;

  select(
    resourceId: IRecordId,
    properties?: IResourceSelectProperties
  ): Promise<any> | undefined;
}

/**
 * Persistence provider.
 * The first part is the indexedDb provider and the second part is remote databse provider.
 */
export enum PersistenceProvider {
  /**
   * Using surreal-wasm which abstracts indexedDb.
   */
  SURREAL = "SURREAL",
  /**
   * Using dexie.js which abstracts indexedDb.
   */
  DEXIE = "DEXIE",
  /**
   * SignalDB has multiple persistence layers - IndexedDb, OPFS
   */
  SIGNALDB = "SIGNALDB",
  /**
   * RxDb supports many persistence layers and also replication
   */
  RXDB = "RXDB",
  /**
   * Direct indexedDb implementation.
   */
  INDEXEDDB = "INDEXEDDB"
}

export enum RemotePersistenceProvider {
  SURREAL = "SURREAL",
  POSTGRES = "POSTGRES",
  SCYLLA = "SCYLLA"
}

export interface IPersistenceInitParams {
  dapId: string;
  product: string;
  userId?: string;
  /**
   * @deprecated
   */
  dbo?: string[];
  tables?: ITable[];
  appVersion?: string;
  isExtensionEnvironment?: boolean;
}

export type ITable = {
  name: Resource;
  indices: string[];
  searchIndices?: string[];
};

export type ILocal = {
  id: string;
  dapId: string;
  createdAt: string;
  version?: string;
  isLocalMode?: boolean;
  lastSyncDown?: number;
  lastSyncUp?: number;
};

export interface ISyncHandler {
  sync(
    mutations: any[],
    lastSyncedAt: number,
    resources: Resource[],
    dapId: string
  ): Promise<any[]>;
  syncDown(
    lastSyncDown: number,
    resources: Resource[],
    dapId: string
  ): Promise<any>;
  cloneCloudToLocal(params: {
    resources: Resource[];
    isExtension?: boolean;
  }): Promise<any>;
  cloneLocalToCloud(resource: Resource, records: any[]): Promise<any>;
}
