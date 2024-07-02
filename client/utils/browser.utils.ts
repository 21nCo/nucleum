import { Direction } from "$lib/client/types/direction.enum";
import { OperatingSystem } from "../types/context.type";
import type { IPopoverRenderParams } from "../types/popover.type";

function documentDimensions() {
  const documentWidth = window.innerWidth;
  const documentHeight = window.innerHeight;
  return {
    documentWidth,
    documentHeight
  };
}

/**
 * @deprecated Use renderPopoverv2 instead
 * @param parentRef
 * @param popRef
 */
export function renderPopover(parentRef: HTMLElement, popRef: HTMLElement) {
  const triggerRect = parentRef.getBoundingClientRect();
  let popRect = popRef.getBoundingClientRect();
  const { documentWidth } = documentDimensions();
  popRef.style.position = "fixed";
  if (documentWidth - triggerRect.right < 300) {
    // console.log("1", {
    //   left: triggerRect.left,
    //   measure: documentWidth - triggerRect.right,
    // });
    // popRef.style.right = `${triggerRect.left}px`;
    // //popRef.style.left = "auto";
    popRef.style.top = `${triggerRect.bottom + 5}px`;
    popRef.style.right = `${documentWidth - triggerRect.right}px`;
  } else if (triggerRect.left < 300) {
    popRef.style.left = `${triggerRect.right}px`;
    popRef.style.right = "auto";
  } else {
    popRef.style.left = `${triggerRect.right + 2}px`;
    popRef.style.right = "auto";
  }
  popRef.style.maxWidth = "300px";
  popRef.style.display = popRef.style.display === "none" ? "block" : "none";
  // popRect = popRef.getBoundingClientRect();
  // console.log({ popRef, popRect });
}

/**
 * Renders a popover at the caret position
 * @param params
 * @returns
 */
export function renderPopoverAtCaretPosition(
  params: Omit<IPopoverRenderParams, "triggerRect" | "isSpanToTriggerWidth">
) {
  const selection = window.getSelection();
  if (selection?.rangeCount === 0) return;
  const range = selection?.getRangeAt(0);
  const rect = range?.getBoundingClientRect();
  if (!rect) return;
  return _renderPopover({
    ...params,
    triggerRect: rect,
    isSpanToTriggerWidth: false
  });
}

export function renderPopoverv2(
  parentRef: HTMLElement,
  popRef: HTMLElement,
  location: Direction = Direction.Down,
  isSpanToTriggerWidth = false,
  offsetInPx = 2
) {
  const triggerRect = parentRef.getBoundingClientRect();
  _renderPopover({
    triggerRect,
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
async function _renderPopover(params: IPopoverRenderParams) {
  let { triggerRect, popRef, placement, isSpanToTriggerWidth, offsetInPx } =
    params;
  popRef.style.display = "block";
  popRef.style.opacity = "0";
  let popRect = popRef.getBoundingClientRect();
  const { documentWidth, documentHeight } = documentDimensions();
  popRef.style.position = "fixed";
  popRef.style.zIndex = "100";

  if (triggerRect.top < popRect.height) {
    if (placement === Direction.TopLeft) placement = Direction.BottomLeft;
    else if (placement === Direction.TopRight)
      placement = Direction.BottomRight;
    else if (placement === Direction.Up) placement = Direction.Down;
  }
  if (documentHeight - triggerRect.bottom < popRect.height) {
    if (placement === Direction.Down) placement = Direction.Up;
    else if (placement === Direction.BottomLeft) placement = Direction.TopLeft;
    else if (placement === Direction.BottomRight)
      placement = Direction.TopRight;
  }
  if (documentWidth - triggerRect.right < popRect.width) {
    if (placement === Direction.Right) placement = Direction.Left;
    if (placement === Direction.Down) placement = Direction.BottomRight;
    if (placement === Direction.Up) placement = Direction.TopRight;
  }
  if (triggerRect.left < popRect.width) {
    if (placement === Direction.Left) placement = Direction.Right;
    if (placement === Direction.Down) placement = Direction.BottomLeft;
    if (placement === Direction.Up) placement = Direction.TopLeft;
  }

  if (placement === Direction.BottomLeft || placement === Direction.TopLeft) {
    popRef.style.left = `${triggerRect.left}px`;
    popRef.style.right = "";
  } else if (
    placement === Direction.BottomRight ||
    placement === Direction.TopRight
  ) {
    popRef.style.right = `${documentWidth - triggerRect.right}px`;
    popRef.style.left = "";
  }
  if (
    placement === Direction.TopLeft ||
    placement === Direction.TopRight ||
    placement === Direction.Up
  ) {
    popRef.style.bottom = `${documentHeight - triggerRect.top + offsetInPx}px`;
    popRef.style.top = "";
  } else if (
    placement === Direction.BottomLeft ||
    placement === Direction.BottomRight ||
    placement === Direction.Down
  ) {
    popRef.style.top = `${triggerRect.bottom + offsetInPx}px`;
    popRef.style.bottom = "";
  }

  if (placement === Direction.Right) {
    popRef.style.left = `${triggerRect.right + offsetInPx}px`;
  } else if (placement === Direction.Left) {
    popRef.style.right = `${documentWidth - triggerRect.left + offsetInPx}px`;
  } else if (placement === Direction.Up || placement === Direction.Down) {
    popRef.style.left = `${triggerRect.left}px`;
  }
  popRect = popRef.getBoundingClientRect();
  if (popRect.width > documentWidth) {
    popRef.style.width = `${documentWidth - 12}px`;
  }
  console.log({ triggerRect, popRect, placement, documentWidth });
  if (popRect.left < 0 || popRect.right > documentWidth) {
    popRef.style.left = "6px";
    popRef.style.right = "6px";
  }
  if (isSpanToTriggerWidth) popRef.style.width = `${triggerRect.width}px`;
  popRef.style.opacity = "1";
}

export function isTextElement(target: EventTarget | null) {
  let tagName;
  if (target instanceof Element) {
    tagName = target.tagName.toLowerCase();
  }
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    tagName === "input" ||
    tagName === "textarea" ||
    (target instanceof HTMLElement &&
      (target as HTMLElement).contentEditable === "true")
  );
}

/**
 *
 *
 * This is the value for userAgent - when opening using SafariViewController within an iOS app:
 * UserAgent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) version/17.5 Mobile/15E148 Safari/604.1
 *
 * From MacOS app:
 * UserAgent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) version/14.1.2 Safari/605.1.15
 *
 *
 *
 * Notes on  navigator.userAgentData:
 * Supported in Chromium 90 and above
 * Not supported in Safari as of 2024-06-21
 *
 * @returns
 */
export function detectSystemOS() {
  let os: OperatingSystem;
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = userAgent ?? navigator.platform.toLowerCase();
  if (platform.includes("win")) {
    os = OperatingSystem.WINDOWS;
  } else if (
    platform.includes("iphone") ||
    platform.includes("ipad") ||
    platform.includes("ios")
  ) {
    os = OperatingSystem.IOS;
  } else if (platform.includes("mac")) {
    os = OperatingSystem.MACOS;
  } else if (platform.includes("android")) {
    os = OperatingSystem.ANDROID;
  } else {
    os = OperatingSystem.UNDETERMINED;
  }
  return os;
}

export function getGeoLocation() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          reject(error);
        }
      );
    } else {
      reject("Geolocation is not supported by this browser.");
    }
  });
}

export function detectTouchDevice() {
  return window.matchMedia("(hover: none)").matches;
}

export function resolveHoverState(event: MouseEvent | FocusEvent) {
  const isTouchDevice = detectTouchDevice();
  return (
    !isTouchDevice && (event.type === "mouseover" || event.type === "focus")
  );
}
