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

/**
 * Where the resource is being accessed from. This is used to determine the context and thus context menu to be shown or thumbnail sizing etc.
 */
export enum ResourceAccessPoint {
  /**
   * The resource is being accessed from the resource browser page.
   */
  BROWSER = "browser",
  /**
   * The resource is being accessed from the library.
   */
  LIBRARY = "library",
  /**
   * The resource is being accessed from the journal.
   */
  JOURNAL = "journal",
  /**
   * The resource is being accessed from the top bar by pinning it.
   */
  TOP_BAR = "topbar",
  /**
   * The resource is being accessed from the resource page.
   */
  SELF = "self",
  OTHER = "other",
  /**
   * The resource is being accessed from the node links pane
   */
  NODE_LINKS = "nodelinks"
}
