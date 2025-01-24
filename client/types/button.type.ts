import type { Size } from "./size.enum";

export enum ButtonStyle {
  DEFAULT = "default",
  PLAIN = "plain",
  OUTLINED = "outlined"
}

export type IButtonParams = {
  label?: string;
  icon?: string;
  callback?: () => Promise<any>;
  action?: string;
  size?: Size.xs | Size.sm | Size.md | Size.lg;
  variant?: ButtonVariant;
  style?: ButtonStyle;
  parentBgIndex?: number;
  shortcut?: string;
  isPreventMinWidth?: boolean;
  popoverAction?: any;
};

export enum ButtonVariant {
  PRIMARY = "primary",
  SECONDARY = "secondary",
  DANGER = "danger",
  SUCCESS = "success"
}

export enum LinkVariant {
  DOTTED = "dotted",
  ARROW = "arrow"
}
