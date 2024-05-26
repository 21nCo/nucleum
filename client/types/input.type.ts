import type { Orientation } from "./direction.enum";
import type { PopoverOptions } from "./popover.type";
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
  isShrink?: boolean;
};

export type InputLabelInfoToolTip = {
  body: string;
  action?: string;
  actionText?: string;
  size?: Size;
};

export type PopoverInputOptions = PopoverOptions & {
  isPreventDefault?: boolean;
  isPreventDefaultStyling?: boolean;
};
