import type { Size } from "./size.enum";

export enum ButtonStyle {
  DEFAULT = "default",
  PLAIN = "plain",
  OUTLINED = "outlined",
  ROUNDED = "rounded"
}

export type ButtonParams = {
  label?: string;
  icon?: string;
  callback?: () => Promise<any>;
  size?: Size;
  variant?: ButtonVariant;
};

export enum ButtonVariant {
  DEFAULT = "default",
  PRIMARY = "primary",
  SECONDARY = "secondary",
  SUCCESS = "success",
  WARNING = "warning",
  DANGER = "danger",
  INFO = "info",
  LIGHT = "light",
  DARK = "dark",
  LINK = "link"
}

export enum LinkVariant {
  DEFAULT = "default",
  DOTTED = "dotted",
  ARROW = "arrow"
}
