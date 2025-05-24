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

export enum MemotronEvent {
  BLOCK_HOVER = "blockHover"
}
