import type { IButtonParams } from "./button.type";

export type ScheduledNotification = {
  inSeconds: number;
  message: string;
  title?: string;
  timestamp: number;
  sound?: string;
  id: string;
};

export type Toast = {
  message: string;
  title?: string;
  type: AlertType;
  sound?: string;
  id: string;
  actionText?: string;
  callback?: () => void;
  isHideClose?: boolean;
};

export type ConfirmationNotification = {
  title: string;
  message: string;
  confirmAction: IButtonParams;
  cancelAction?: IButtonParams;
};

export enum AlertType {
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
  WARNING = "WARNING"
}
