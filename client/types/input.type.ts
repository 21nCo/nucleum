import type { Orientation, Placement } from "./direction.enum";
import type { IPopoverOptions } from "./popover.type";
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
  badge?: string;
};

export type InputLabelInfoToolTip = {
  body: string;
  action?: string;
  actionText?: string;
  size?: Size;
  isUseAbsolutePositioning?: boolean;
  placement?: Placement;
};

export type PopoverInputOptions = IPopoverOptions & {
  isPreventDefault?: boolean;
  isPreventDefaultStyling?: boolean;
};
