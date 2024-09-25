import type { Resource } from "../components/flux/resourceStores/resource.enum";
import type {
  IMetaResource,
  IResource
} from "../components/flux/resourceStores/resource.type";
import type {
  IMutationParamsv2,
  IRecordId,
  IResourceSelectParams
} from "../types/data.type";

export enum ClientStorageKey {
  ENV = "env",
  PRODUCT = "product",
  IS_EXTENSION_LOGIN = "isExtensionLogin",
  APP_DATA = "appData",
  /**
   * Surreal token
   */
  STOKEN = "stoken",
  USER_INFO = "userInfo",
  /**
   * @deprecated - use userId instead
   */
  GUEST = "guest",
  SPACE_IN_CONTEXT = "spaceInContext",
  OFFLINE_SESSION_ID = "offlineSessionId",
  LAST_SYNCED_AT = "lastSyncedAt",
  /**
   * Device access point id. This id will be unique for each access point on a given device. Ex: different broswer logins, macOS app login etc.
   *
   * This is used to determine the need for cloning cloud db to local db if logged in from different access points.
   *
   */
  DAP_ID = "dapId",

  INTERCOM_ID = "intercomId"
}

export interface IPersistence {
  /**
   *
   * @param userId
   * @param params
   * @returns 0 if no database is present locally for the given userId, 1 if a database is present for the given id but is not an offline session earlier, 2 if the database is present and was used as offline session earlier. Returns -1 for any errors
   */
  initialize(userId: string, params?: IPersistenceInitParams): Promise<number>;

  mutation<T extends IResource | IMetaResource>(
    resource: Resource,
    params: IMutationParamsv2<T>
  ): Promise<any> | undefined;

  query(query: string, params: any): Promise<any> | undefined;

  selectMany(
    resource: Resource,
    params?: IResourceSelectParams
  ): Promise<any> | undefined;

  select(
    resourceId: IRecordId,
    properties?: string[]
  ): Promise<any> | undefined;
}

/**
 * Persistence provider.
 * The first part is the indexedDb provider and the second part is remote databse provider.
 */
export enum PersistenceProvider {
  /**
   * Using surreal-wasm as indexedDb provider with surreal as remote database provider.
   */
  SURREAL_SURREAL = "SURREAL_SURREAL",
  /**
   * Using dexie as indexedDb provider with surreal as remote database provider.
   */
  DEXIE_SURREAL = "DEXIE_SURREAL",
  SIGNAL_SURREAL = "SIGNAL_SURREAL",
  DEXIE_POSTGRES = "DEXIE_POSTGRES",
  SCYLLA = "scylla"
}

export enum RemotePersistenceProvider {
  SURREAL = "SURREAL",
  POSTGRES = "POSTGRES",
  SCYLLA = "SCYLLA"
}

export interface IPersistenceInitParams {
  isLocalMode?: boolean;
  dbo?: string[];
}

export interface ISyncHandler {
  sync(mutations: any[]): Promise<void>;
  syncDown(): Promise<any>;
  cloneCloudToLocal(resources: string[]): Promise<any>;
  cloneLocalToCloud(resources: string[]): Promise<any>;
}
