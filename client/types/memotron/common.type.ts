import type { ITrashInformation } from "../resource.type";

export interface IMemotronItemBase {
  id: string;
  label: string;
  isStarred?: boolean;
  isArchived?: boolean;
  trashInformation?: ITrashInformation;
  createdAt: string;
  modifiedAt: string;
  createdBy: string;
  modifiedBy: string;
}

/**
 * @deprecated - Use ITrashInformation from resource.type.ts instead
 */
export interface TrashInformation {
  deletedAt: string;
  deletedBy: string;
}

export enum MemotronResourceType {
  NODE = "NODE",
  COLLECTION = "COLLECTION",
  TYPED_COLLECTION = "TYPED_COLLECTION",
  QUERY_COLLECTION = "QUERY_COLLECTION",
  COMBINATION = "COMBINATION",
  TASK = "TASK"
}
