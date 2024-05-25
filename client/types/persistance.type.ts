import type { DbRecord } from "./dbrecord.type";

export type QueryParams =
  | string
  | number
  | boolean
  | string[]
  | DbRecord
  | DbRecord[]
  | MergeRecord;

export type MergeRecord = Partial<DbRecord> & Required<Pick<DbRecord, "id">>;
