import type { Resource } from "../components/resourceStores/resource.enum";
import type { IResource } from "../components/resourceStores/resource.type";
import type { IResourceSelectParams } from "../types/data.type";

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
  GUEST = "guest",
  SPACE_IN_CONTEXT = "spaceInContext",

  INTERCOM_ID = "intercomId"
}

export interface IPersistence {
  initialize(userId: string, params?: IPersistenceInitParams): Promise<void>;

  insert<T extends IResource>(
    records: T[],
    resource: Resource
  ): Promise<any> | undefined;

  replace<T extends IResource>(record: T): Promise<any> | undefined;

  merge<T extends IResource>(record: Partial<T>): Promise<any> | undefined;

  delete(resourceId: string): Promise<any> | undefined;

  bulkEdit<T extends IResource>(
    resource: Resource,
    records: T[]
  ): Promise<any> | undefined;

  query(query: string, params: any): Promise<any> | undefined;

  selectMany(
    resource: Resource,
    params?: IResourceSelectParams
  ): Promise<any> | undefined;

  select(resourceId: string, properties?: string[]): Promise<any> | undefined;
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
  DEXIE_POSTGRES = "DEXIE_POSTGRES",
  SCYLLA = "scylla"
}

export interface IPersistenceInitParams {
  isLocalMode?: boolean;
  dbo?: string[];
}
