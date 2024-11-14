import type {
  IObservableStoreSubject,
  IRecordId
} from "$lib/client/types/data.type";
import type {
  IClip,
  INodePropertyValue
} from "$lib/client/products/memotron/node/node.type";
import type { AlertType } from "$lib/client/types/notification.type";
export interface IWebpageStore extends IObservableStoreSubject {
  url: string;
  title: string;
  id?: IRecordId;
  clips?: (IClip & { links: any[] })[];
  links?: string[];
  properties?: INodePropertyValue[];
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
  isPreventAutoClose?: boolean;
  isShowStatusOnly?: boolean;
}

export interface ISyncStore extends IObservableStoreSubject {
  id?: string;
  status?: SyncStatus;
  isShowSyncPane?: boolean;
  lastSyncedAt?: string;
  progress?: number;
  message?: string;
}

export enum SyncStatus {
  SYNCED = "SYNCED",
  SYNCING = "SYNCING",
  NOT_SYNCED = "NOT_SYNCED",
  ERRORED = "ERRORED"
}
