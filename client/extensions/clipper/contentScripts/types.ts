import type {
  IObservableStoreSubject,
  IRecordId
} from "$lib/client/types/data.type";
import type {
  IClip,
  INodeProperty
} from "$lib/client/products/memotron/node/node.type";
import type { AlertType } from "$lib/client/types/notification.type";
export interface IWebpage extends IObservableStoreSubject {
  url: string;
  id?: IRecordId;
  clips?: (IClip & { links: any[] })[];
  links?: string[];
  properties?: INodeProperty[];
  notes?: string;
  relationships?: { node: string; relation: string }[];
}

export interface IArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type IImageElement = { src: string; alt: string };

export interface IFeedbackPaneStore extends IObservableStoreSubject {
  isShown: boolean;
  feedback: string | { message: string; type: AlertType };
  /**
   * The clip that is currently focused in the feedback pane.
   */
  focusedClip: IClip | null;
}

export interface ISyncStore extends IObservableStoreSubject {
  id?: string;
  status?: SyncStatus;
  isShowSyncPane?: boolean;
  lastSyncedAt?: string;
}

export enum SyncStatus {
  SYNCED = "SYNCED",
  SYNCING = "SYNCING",
  NOT_SYNCED = "NOT_SYNCED",
  ERRORED = "ERRORED"
}
