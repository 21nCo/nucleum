import type { DbRecordBase } from "$lib/client/types/dbrecord.type";

export type ITag = {
  id: string;
  label: string;
  hue?: number;
};

export type PointTagDbType = DbRecordBase & {
  label: string;
};
