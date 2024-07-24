import type { LocalDbRecord } from "$local/local";
import type {
  TimeZoneRecord,
  IUserGlobalPreferences
} from "./preferences.type";

/**
 * @deprecated - Use IResourceBase from resource.type.ts instead
 */
export interface DbRecordBase {
  id?: string;
  createdAt?: string;
  modifiedAt?: string;
}

/**
 * @deprecated - Use IResourceBase from resource.type.ts instead
 */
export interface DbRecordWithLabel extends DbRecordBase {
  label: string;
}

/**
 * @deprecated - Use IResourceBase from resource.type.ts instead
 */
export type GlobalDbRecord = TimeZoneRecord | IUserGlobalPreferences;

/**
 * @deprecated - Use IResourceBase from resource.type.ts instead
 */
export type DbRecord = DbRecordBase & (GlobalDbRecord | LocalDbRecord);
