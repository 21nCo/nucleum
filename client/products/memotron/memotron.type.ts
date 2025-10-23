import type {
  IResource,
  IResourceShareable
} from "@21n/components/flux/resourceStores/resource.type";

/**
 * @deprecated - directly extend IResource, IResourceShareable etc instead
 */
export interface IMemotronItemBase extends IResource, IResourceShareable {
  isStarred?: boolean;
}

export enum MemotronEvent {
  BLOCK_HOVER = "blockHover"
}
