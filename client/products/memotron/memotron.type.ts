import type {
  IResource,
  IResourseShareable
} from "$lib/client/components/flux/resourceStores/resource.type";

export interface IMemotronItemBase extends IResource, IResourseShareable {
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
  NODE = "node",
  COLLECTION = "collection",
  TYPED_COLLECTION = "typed_collection",
  QUERY_COLLECTION = "QUERY_COLLECTION",
  COMBINATION = "combination",
  TASK = "task"
}

export enum MemotronEvent {
  BLOCK_HOVER = "blockHover"
}
