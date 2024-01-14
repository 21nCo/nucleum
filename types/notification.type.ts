import type { ButtonParams } from "./button.type";

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
};

export type ConfirmationNotification = {
  title: string;
  message: string;
  confirmAction: ButtonParams;
  cancelAction?: ButtonParams;
};

export enum AlertType {
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
  WARNING = "WARNING"
}
