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
   * The last time user interacted with the resource
   *
   * This is almost same as modifiedAt but it is used to track the last time user interacted with the resource. For example, if user has opened a resource, interactedAt will be reset.
   */
  interactedAt: string;
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

export enum ResourceAccessMode {
  INLINE = "inline",
  SPLIT = "split",
  /**
   * Split in focus mode
   */
  FSPLIT = "fsplit",
  POP = "pop",
  FOCUS = "focus",
  TOPBARFOCUS = "tbf"
}

export enum ResourceActionType {
  BROWSE = "browse",
  OPEN = "open",
  CREATE = "create",
  EDIT = "edit",
  DELETE = "delete",
  ARCHIVE = "archive",
  RESTORE = "restore"
}

export enum ResourceAccessPoint {
  BROWSER = "browser",
  LIBRARY = "library",
  JOURNAL = "journal",
  TOP_BAR = "topbar",
  SELF = "self",
  OTHER = "other"
}
