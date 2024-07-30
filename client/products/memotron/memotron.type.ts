import type {
  IResource,
  IResourseShareable
} from "$lib/client/components/resourceStores/resource.type";

export interface IMemotronItemBase extends IResource, IResourseShareable {
  label: string;
  isStarred?: boolean;
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
