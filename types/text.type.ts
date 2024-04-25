import type { Size } from "./size.enum";

export type FormLabelInfoTooltip = {
  body: string;
  link?: string;
  linkText?: string;
  size?: Size;
};

export enum InfoTextType {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error"
}
