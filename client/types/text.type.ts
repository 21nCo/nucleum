import type { Size } from "./size.enum";

/**
 * @deprecated - use InputLabel instead
 */
export type FormLabelInfoTooltip = {
  body: string;
  link?: string;
  linkText?: string;
  size?: Size;
};

export enum InfoTextType {
  INFO = "info",
  TIP = "lightbulb",
  WARNING = "warning",
  ERROR = "error"
}
