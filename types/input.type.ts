import type { Orientation } from "./direction.enum";
import type { Size } from "./size.enum";

export enum InputStyle {
  PLAIN = "plain",
  BORDERED = "bordered",
  FILLED = "filled"
}

export type InputLabel = {
  label: string;
  orientation?: Orientation;
  tooltip?: InputLabelInfoToolTip;
  isMarkRequired?: boolean;
};

export type InputLabelInfoToolTip = {
  body: string;
  action?: string;
  actionText?: string;
  size?: Size;
};
