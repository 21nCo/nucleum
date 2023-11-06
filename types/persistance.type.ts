import type { DbRecordType } from "$lib/local/types/item.type";

export type QueryParams =
  | string
  | number
  | boolean
  | DbRecordType
  | DbRecordType[]
  | MergeRecord;

export type MergeRecord = Partial<DbRecordType> &
  Required<Pick<DbRecordType, "id">>;
