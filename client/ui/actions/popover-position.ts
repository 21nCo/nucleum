import { Placement } from "@21n/ui/elements/direction.enum";
import type { IPopoverRenderParams } from "@21n/ui/actions/popover.type";

function documentDimensions() {
  const documentWidth = window.innerWidth;
  const documentHeight = window.innerHeight;
  return {
    documentWidth,
    documentHeight
  };
}

export function renderPopover(params: IPopoverRenderParams) {
  params = {
    ...params,
    placement: params.placement ?? Placement.BottomCenter,
    offsetInPx: params.offsetInPx ?? 2,
    isSpanToTriggerWidth: params.isSpanToTriggerWidth ?? false,
    isUseAbsolutePositioning: params.isUseAbsolutePositioning ?? false,
    isPlaceAtCaret: params.isPlaceAtCaret ?? false
  };

  if (params.isUseAbsolutePositioning) {
    return renderPopoverUsingAbsolutePositioning({
      ...params
    });
  } else if (params.isPlaceAtCaret) {
    return _renderPopoverAtCaretPosition(params);
  } else {
    renderPopoverUsingFixedPositioning(
      params.triggerRef,
      params.popRef,
      params.placement,
      params.isSpanToTriggerWidth ?? false,
      params.offsetInPx ?? 2
    );
  }
}

/**
 * Renders a popover at the caret position
 * @param params
 * @returns
 */
function _renderPopoverAtCaretPosition(
  params: Omit<IPopoverRenderParams, "triggerRect" | "isSpanToTriggerWidth">
) {
  const selection = window.getSelection();
  if (selection?.rangeCount === 0) return;
  const range = selection?.getRangeAt(0);
  const rect = range?.getBoundingClientRect();
  if (!rect) return;
  return _renderPopoverUsingFixedPositioning(rect, {
    ...params,
    isSpanToTriggerWidth: false
  });
}

function renderPopoverUsingFixedPositioning(
  triggerRef: HTMLElement,
  popRef: HTMLElement,
  location: Placement = Placement.BottomCenter,
  isSpanToTriggerWidth = false,
  offsetInPx = 2
) {
  const triggerRect = triggerRef?.getBoundingClientRect();
  _renderPopoverUsingFixedPositioning(triggerRect, {
    triggerRef,
    popRef,
    placement: location,
    isSpanToTriggerWidth,
    offsetInPx
  });
}

/**
 * Renders a popover at the specified location and auto adjusts if the popover is going out of the screen.
 * @param params
 */
async function _renderPopoverUsingFixedPositioning(
  triggerRect: DOMRect,
  params: IPopoverRenderParams
) {
  let { popRef, placement, isSpanToTriggerWidth, offsetInPx } = params;
  if (!offsetInPx) offsetInPx = 4;
  popRef.style.display = "block";
  popRef.style.opacity = "0";
  let popRect = popRef.getBoundingClientRect();
  const { documentWidth, documentHeight } = documentDimensions();
  popRef.style.position = "fixed";
  popRef.style.zIndex = "100";

  if (triggerRect.top < popRect.height) {
    if (placement === Placement.TopLeft) placement = Placement.BottomLeft;
    else if (placement === Placement.TopRight)
      placement = Placement.BottomRight;
    else if (placement === Placement.TopCenter)
      placement = Placement.BottomCenter;
  }
  if (documentHeight - triggerRect.bottom < popRect.height) {
    if (placement === Placement.BottomCenter) placement = Placement.TopCenter;
    else if (placement === Placement.BottomLeft) placement = Placement.TopLeft;
    else if (placement === Placement.BottomRight)
      placement = Placement.TopRight;
  }
  if (
    triggerRect.top < popRect.height &&
    documentHeight - triggerRect.bottom < popRect.height
  ) {
    placement = Placement.Left;
  }
  if (!isSpanToTriggerWidth) {
    if (documentWidth - triggerRect.right < popRect.width) {
      if (placement === Placement.Right) placement = Placement.Left;
      if (placement === Placement.BottomCenter)
        placement = Placement.BottomRight;
      if (placement === Placement.TopCenter) placement = Placement.TopRight;
    }
    if (triggerRect.left < popRect.width) {
      if (placement === Placement.Left) placement = Placement.Right;
      if (placement === Placement.BottomCenter)
        placement = Placement.BottomLeft;
      if (placement === Placement.TopCenter) placement = Placement.TopLeft;
    }
  }

  if (placement === Placement.BottomLeft || placement === Placement.TopLeft) {
    popRef.style.left = `${triggerRect.left}px`;
    popRef.style.right = "";
  } else if (
    placement === Placement.BottomRight ||
    placement === Placement.TopRight
  ) {
    popRef.style.right = `${documentWidth - triggerRect.right}px`;
    popRef.style.left = "";
  }
  if (
    placement === Placement.TopLeft ||
    placement === Placement.TopRight ||
    placement === Placement.TopCenter
  ) {
    popRef.style.bottom = `${documentHeight - triggerRect.top + offsetInPx}px`;
    popRef.style.top = "";
  } else if (
    placement === Placement.BottomLeft ||
    placement === Placement.BottomRight ||
    placement === Placement.BottomCenter
  ) {
    popRef.style.top = `${triggerRect.bottom + offsetInPx}px`;
    popRef.style.bottom = "";
  }

  if (placement === Placement.Right) {
    popRef.style.left = `${triggerRect.right + offsetInPx}px`;
    popRef.style.top = `${triggerRect.top + triggerRect.height / 2 - popRect.height / 2}px`;
  } else if (placement === Placement.Left) {
    popRef.style.right = `${documentWidth - triggerRect.left + offsetInPx}px`;
    popRef.style.top = `${triggerRect.top + triggerRect.height / 2 - popRect.height / 2}px`;
  } else if (
    placement === Placement.TopCenter ||
    placement === Placement.BottomCenter
  ) {
    if (isSpanToTriggerWidth) {
      popRef.style.left = triggerRect.left + "px";
    } else {
      popRef.style.left = `${triggerRect.left + triggerRect.width / 2 - popRect.width / 2}px`;
    }
  }
  popRect = popRef.getBoundingClientRect();
  if (popRect.width > documentWidth) {
    popRef.style.width = `${documentWidth - 12}px`;
  }
  if (popRect.left < 0 || popRect.right > documentWidth) {
    popRef.style.left = "6px";
    popRef.style.right = "6px";
  }
  if (isSpanToTriggerWidth) popRef.style.width = `${triggerRect.width}px`;
  popRef.style.opacity = "1";
}

function renderPopoverUsingAbsolutePositioning(params: IPopoverRenderParams) {
  let { triggerRef, popRef, placement, isSpanToTriggerWidth, offsetInPx } =
    params;
  if (!popRef) return;
  if (!offsetInPx) offsetInPx = 4;
  const triggerRect = triggerRef?.getBoundingClientRect();
  popRef.style.display = "block";
  popRef.style.opacity = "0";
  popRef.style.position = "absolute";
  popRef.style.zIndex = "100";
  popRef.style.top = "";
  popRef.style.bottom = "";
  popRef.style.left = "";
  popRef.style.right = "";
  switch (placement) {
    case Placement.TopCenter:
      popRef.style.bottom = `${triggerRect.height + offsetInPx}px`;
      break;
    case Placement.BottomCenter:
      popRef.style.top = `${triggerRect.height + offsetInPx}px`;
      break;
    case Placement.Left:
      popRef.style.right = `${triggerRect.width + offsetInPx}px`;
      break;
    case Placement.Right:
      popRef.style.left = `${triggerRect.width + offsetInPx}px`;
      break;
  }

  if (isSpanToTriggerWidth) popRef.style.width = `${triggerRect.width}px`;
  popRef.style.opacity = "1";
}
