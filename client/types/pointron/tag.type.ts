import type { DbRecordBase } from "$lib/client/types/dbrecord.type";
import type { ICacheableStore } from "$lib/client/types/data.type";

export type Tag = {
  id: string;
  label: string;
  hue?: number;
};

export type PointTagDbType = DbRecordBase & {
  label: string;
};

export interface TagStore extends ICacheableStore {
  tags: Tag[];
}
