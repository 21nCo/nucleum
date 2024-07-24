import type { Position } from "./direction.enum";

export type IPopoverOptions = IPopoverRenderBaseParams & {
  element?: "div" | "button";
  class?: string;
  id?: string;
  isPreventDefaultStyling?: boolean;
  parentBgIndex?: number;
};

export type IPopoverRenderParams = IPopoverRenderBaseParams & {
  triggerRef: HTMLElement;
  popRef: HTMLElement;
};

export type IPopoverRenderBaseParams = {
  placement?: Position;
  isSpanToTriggerWidth?: boolean;
  offsetInPx?: number;
  isUseAbsolutePositioning?: boolean;
  isPlaceAtCaret?: boolean;
};

export enum PopoverTriggerMethod {
  CLICK = "click",
  RIGHT_CLICK = "right-click",
  NONE = "none"
}
