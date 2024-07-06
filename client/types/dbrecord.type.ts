import type { LocalDbRecord } from "$local/local";
import type {
  TimeZoneRecord,
  IUserGlobalPreferences
} from "./preferences.type";

export interface DbRecordBase {
  id?: string;
  createdAt?: string;
  modifiedAt?: string;
}

export interface DbRecordWithLabel extends DbRecordBase {
  label: string;
}

export type GlobalDbRecord = TimeZoneRecord | IUserGlobalPreferences;
export type DbRecord = DbRecordBase & (GlobalDbRecord | LocalDbRecord);
