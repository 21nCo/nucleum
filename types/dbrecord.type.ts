import type { LocalDbRecord } from "$lib/local/types/item.type";
import type { TimeZoneRecord, UserGlobalPreferences } from "./preferences.type";

export interface DbRecordBase {
  id?: string;
  createdAt?: string;
  modifiedAt?: string;
}

export interface DbRecordWithLabel extends DbRecordBase {
  label: string;
}

export type GlobalDbRecord = TimeZoneRecord | UserGlobalPreferences;
export type DbRecord = DbRecordBase & (GlobalDbRecord | LocalDbRecord);
