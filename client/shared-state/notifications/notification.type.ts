export type Toast = {
  id: string;
  type: AlertType;
  message?: string;
  title?: string;
  sound?: string;
  actionText?: string;
  callback?: () => void;
  isNonDismissable?: boolean;
  progress?: number;
};

export enum AlertType {
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
  WARNING = "WARNING",
  INFO = "INFO",
  PROGRESS = "PROGRESS"
}

export type IInlineStatus = {
  message: string;
  type: AlertType;
};

export type InlineToast = {
  id: string;
  type: AlertType;
  message: string;
  title?: string;
  data?: any;
};
