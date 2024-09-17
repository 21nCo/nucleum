import type { IRecordId } from "$lib/client/types/data.type";

export interface IResourceBase {
  id: IRecordId;
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
   *
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

  [key: string]: unknown;
}

/**
 * Meta resource are created by system and are not meant to be created by the user. Ex: mutation, accessLog, etc.
 */
export interface IMetaResource extends IResourceBase {
  modifiedAt?: string;
  [key: string]: unknown;
}

export type IUnlabeledResource = Omit<IResource, "label">;

export interface IResourseShareable {
  createdBy: IRecordId;
  modifiedBy: IRecordId;
}

export interface ITrashInformation {
  deletedAt: string;
  deletedBy: string;
}

export enum ResourceAccessMode {
  INLINE = "inline",
  /**
   * Inline split
   */
  SPLIT = "split",
  /**
   * Split in full screen or pop mode
   */
  FSPLIT = "fsplit",
  /**
   * Pop mode
   */
  POP = "pop",
  /**
   * Full screen mode
   */
  FULL = "full",
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
  NODE_LINKS = "nodelinks",
  /**
   * The resource is being accessed from the node default right pane
   */
  NODE_DEFAULT_RIGHT_PANE = "nodedefaultrightpane"
}

export type IResourceCapture<T extends IResource> = Omit<
  T,
  | "createdAt"
  | "modifiedAt"
  | "createdBy"
  | "modifiedBy"
  | "interactedAt"
  | "id"
>;

export type IResourceCaptureWithId<T extends IResource> = Omit<
  T,
  "createdAt" | "modifiedAt" | "createdBy" | "modifiedBy" | "interactedAt"
>;
