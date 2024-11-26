import type { ObservableStore } from "$lib/client/stores/client.store";
import type {
  IMutationAdditionalParams,
  IRecordId
} from "$lib/client/types/data.type";
import type { Resource } from "./resource.enum";

export interface IResourceBase {
  id: IRecordId;
  createdAt: string;
}

export interface IResource extends IResourceBase {
  /**
   * The label of the resource
   */
  label?: string;
  /**
   * The last time the resource was modified
   */
  modifiedAt: string;
  /**
   * @deprecated - use accessLog instead
   * The last time user interacted with the resource
   *
   * This is almost same as modifiedAt but it is used to track the last time user interacted with the resource. For example, if user has opened a resource, interactedAt will be reset.
   *
   */
  interactedAt?: string;
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

export interface IActiveResource extends IResource {
  accessMode: ResourceAccessMode;
  isInEditMode?: boolean;
  isInReadMode?: boolean;
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
  TAB = "tab",
  TAB_IN_BACKGROUND = "tab-in-background",
  /**
   * The resource is being accessed from the tabs.
   */
  TABS = "tabs",
  SLIDESHOW = "slideshow"
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
  TABS = "tabs",
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
   * The resource is being accessed from the node clips pane
   */
  NODE_TRACES = "nodetraces",
  /**
   * The resource is being accessed from the node page
   */
  COLLECTION = "collection",
  SEARCH_RESULT = "searchresult",
  /**
   * The resource is being accessed from the markdown embed
   */
  MARKDOWN_EMBED = "markdownembed",
  /**
   * The resource is being accessed from the combination
   */
  COMBINATION = "combination",
  CAPTURE = "capture"
}

export enum ResourceAccessPointState {
  DEFAULT = "default",
  /**
   * During edit like single or bulk edit in access point like browser, library, etc.
   */
  EDIT = "edit",
  /**
   * During search in the access point like browser, library, etc.
   */
  SEARCH = "search"
}

/**
 * @deprecated - doesn't help with type inference if nested type intersections. Use {@link OmitForCapture} or {@link OmitFields} instead.
 */
export type IResourceCapture<T extends IResource> = Omit<
  T,
  | "createdAt"
  | "modifiedAt"
  | "createdBy"
  | "modifiedBy"
  | "interactedAt"
  | "id"
>;

/**
 * @deprecated - doesn't help with type inference if nested type intersections. Use {@link OmitForCaptureWithId} or {@link OmitFields} instead.
 */
export type IResourceCaptureWithId<T extends IResource> = Omit<
  T,
  "createdAt" | "modifiedAt" | "createdBy" | "modifiedBy" | "interactedAt"
>;

export type CaptureOmittedFields =
  | "createdAt"
  | "modifiedAt"
  | "createdBy"
  | "modifiedBy"
  | "interactedAt"
  | "id";

export type OmitForCapture<T> = {
  [K in keyof T as Exclude<K, CaptureOmittedFields>]: T[K];
} & {
  [K in Extract<keyof T, CaptureOmittedFields>]?: T[K];
};

export type OmitForCaptureWithId<T> = {
  [K in keyof T as Exclude<K, CaptureOmittedFields>]: T[K];
} & {
  id: IRecordId;
};

export type OmitFields<T, K extends keyof T> = {
  [P in keyof T as Exclude<P, K>]: T[P];
} & {
  [P in K]?: T[P];
};

export interface IMultiSelectContext {
  resource: Resource;
  accessPoint: ResourceAccessPoint;
  accessPointId?: IRecordId;
}

export interface IMultiSelectStore extends ObservableStore<IRecordId[]> {
  context: IMultiSelectContext;
}

export type IResourceMutationParams = IMutationAdditionalParams & {
  /**
   * Whether the mutation should prevent back propagated to active resource stores
   */
  isPreventBackPropagation?: boolean;
  /**
   * Whether the mutation persistance should be debounced
   */
  isDebounced?: boolean;
  /**
   * The key to be used for debouncing the mutation
   */
  debounceKey?: string;
};
