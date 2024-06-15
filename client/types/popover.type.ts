import type { Direction } from "./direction.enum";

export type IPopoverOptions = {
  element?: "div" | "button";
  class?: string;
  id?: string;
  isPreventDefaultStyling?: boolean;
  parentBgIndex?: number;
  placement?: Direction;
  isSpanToTriggerWidth?: boolean;
  offsetInPx?: number;
  isPlaceAtCaret?: boolean;
};

export type IPopoverRenderParams = {
  triggerRect: DOMRect;
  popRef: HTMLElement;
  location: Direction;
  isSpanToTriggerWidth: boolean;
  offsetInPx: number;
};
