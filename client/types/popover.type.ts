import type { Position } from "./direction.enum";

export type IPopoverOptions = {
  element?: "div" | "button";
  class?: string;
  id?: string;
  isPreventDefaultStyling?: boolean;
  parentBgIndex?: number;
  placement?: Position;
  isSpanToTriggerWidth?: boolean;
  offsetInPx?: number;
  isPlaceAtCaret?: boolean;
  isUseAbsolutePositioning?: boolean;
};

export type IPopoverRenderParams = {
  triggerRect: DOMRect;
  popRef: HTMLElement;
  placement: Position;
  isSpanToTriggerWidth: boolean;
  offsetInPx: number;
};
