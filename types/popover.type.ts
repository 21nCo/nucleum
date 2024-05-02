import type { Direction } from "./direction.enum";

export type PopoverOptions = {
  element?: "div" | "button";
  class?: string;
  id?: string;
  isPreventDefaultStyling?: boolean;
  parentBgIndex?: number;
  placement?: Direction;
  isSpanToTriggerWidth?: boolean;
};
