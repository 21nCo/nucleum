import type { IRecordId } from "$lib/client/types/data.type";
import type { IClip } from "$lib/client/products/memotron/node/node.type";
import type { AlertType } from "$lib/client/types/notification.type";
import type { ICollectionItemPropertyValue } from "$lib/client/components/collection/collection.type";
export interface IWebpageStore {
  url: string;
  title: string;
  id?: IRecordId;
  clips?: (IClip & { links: any[] })[];
  links?: string[];
  collections?: IRecordId[];
  properties?: ICollectionItemPropertyValue[];
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

export interface IFeedbackPaneStore {
  isShown: boolean;
  feedback: string | { message: string; type: AlertType };
  /**
   * The clip that is currently focused in the feedback pane.
   */
  focusedClip: IClip | null;
  /**
   * The clip that is currently open in the modal
   */
  modalClip: IClip | null;
  isPreventAutoClose?: boolean;
  isShowStatusOnly?: boolean;
  /**
   * Whether the feedback pane is user initiated. Used to prevent auto close.
   */
  isUserInitiated?: boolean;
}

export interface ISyncStore {
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
