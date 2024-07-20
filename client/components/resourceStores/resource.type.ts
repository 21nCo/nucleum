export interface IResourceBase {
  id: string;
  createdAt: string;
}

export interface IResource extends IResourceBase {
  /**
   * The label of the resource
   */
  label: string;
  /**
   * The last time the resource was modified
   */
  modifiedAt: string;
  /**
   * Whether the resource is archived or not
   */
  isArchived?: boolean;
  /**
   * Trash information of the resource
   */
  trashInformation?: ITrashInformation;
}

export type IUnlabeledResource = Omit<IResource, "label">;

export interface IResourseShareable {
  createdBy: string;
  modifiedBy: string;
}

export interface ITrashInformation {
  deletedAt: string;
  deletedBy: string;
}
