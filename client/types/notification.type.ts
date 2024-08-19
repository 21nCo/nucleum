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
  id: string;
  type: AlertType;
  message?: string;
  title?: string;
  sound?: string;
  actionText?: string;
  callback?: () => void;
  isNonDismissable?: boolean;
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
  WARNING = "WARNING",
  INFO = "INFO"
}
