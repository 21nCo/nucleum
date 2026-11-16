import type { Placement } from "@21n/ui/elements/direction.enum";

export type IPopoverOptions = IPopoverRenderBaseParams & {
  element?: "div" | "button";
  class?: string;
  id?: string;
  isPreventDefaultStyling?: boolean;
  parentBgIndex?: number;
  /**
   * If true, only one popover will be shown at a time with the same .
   */
  isOnlyOneVisiblePerGroup?: boolean;
  groupId?: string;
};

export type IPopoverRenderParams = IPopoverRenderBaseParams & {
  triggerRef: HTMLElement;
  popRef: HTMLElement;
};

export type IPopoverRenderBaseParams = {
  placement?: Placement;
  isSpanToTriggerWidth?: boolean;
  offsetInPx?: number;
  isUseAbsolutePositioning?: boolean;
  isPlaceAtCaret?: boolean;
};

/**
 * Marks popover content, such as a nested submenu, whose clicks are not
 * outside clicks for any open popover, so a pick there keeps its parent open.
 */
export const POPOVER_KEEP_OPEN_ATTRIBUTE = "data-popover-keep-open";

export enum PopoverTriggerMethod {
  CLICK = "click",
  RIGHT_CLICK = "right-click",
  HOVER = "hover",
  NONE = "none",
  SHOW_BY_DEFAULT = "show-by-default"
}
