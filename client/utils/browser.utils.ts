import { Position } from "$lib/client/types/direction.enum";
import { OperatingSystem } from "../types/context.type";
import { GlobalEvent } from "../types/event.enum";
import type { IPopoverRenderParams } from "../types/popover.type";
import { deepCopy } from "./obj.utils";

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
    placement: params.placement ?? Position.BottomCenter,
    offsetInPx: params.offsetInPx ?? 2,
    isSpanToTriggerWidth: params.isSpanToTriggerWidth ?? false,
    isUseAbsolutePositioning: params.isUseAbsolutePositioning ?? false,
    isPlaceAtCaret: params.isPlaceAtCaret ?? false
  };
  // console.log("renderPopover ",{params: deepCopy(params)});
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
  location: Position = Position.BottomCenter,
  isSpanToTriggerWidth = false,
  offsetInPx = 2
) {
  const triggerRect = triggerRef.getBoundingClientRect();
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
  popRef.style.display = "block";
  popRef.style.opacity = "0";
  let popRect = popRef.getBoundingClientRect();
  const { documentWidth, documentHeight } = documentDimensions();
  popRef.style.position = "fixed";
  popRef.style.zIndex = "100";

  if (triggerRect.top < popRect.height) {
    if (placement === Position.TopLeft) placement = Position.BottomLeft;
    else if (placement === Position.TopRight) placement = Position.BottomRight;
    else if (placement === Position.TopCenter)
      placement = Position.BottomCenter;
  }
  if (documentHeight - triggerRect.bottom < popRect.height) {
    if (placement === Position.BottomCenter) placement = Position.TopCenter;
    else if (placement === Position.BottomLeft) placement = Position.TopLeft;
    else if (placement === Position.BottomRight) placement = Position.TopRight;
  }
  if (
    triggerRect.top < popRect.height &&
    documentHeight - triggerRect.bottom < popRect.height
  ) {
    placement = Position.Left;
  }
  if (!isSpanToTriggerWidth) {
    if (documentWidth - triggerRect.right < popRect.width) {
      if (placement === Position.Right) placement = Position.Left;
      if (placement === Position.BottomCenter) placement = Position.BottomRight;
      if (placement === Position.TopCenter) placement = Position.TopRight;
    }
    if (triggerRect.left < popRect.width) {
      if (placement === Position.Left) placement = Position.Right;
      if (placement === Position.BottomCenter) placement = Position.BottomLeft;
      if (placement === Position.TopCenter) placement = Position.TopLeft;
    }
  }

  if (placement === Position.BottomLeft || placement === Position.TopLeft) {
    popRef.style.left = `${triggerRect.left}px`;
    popRef.style.right = "";
  } else if (
    placement === Position.BottomRight ||
    placement === Position.TopRight
  ) {
    popRef.style.right = `${documentWidth - triggerRect.right}px`;
    popRef.style.left = "";
  }
  if (
    placement === Position.TopLeft ||
    placement === Position.TopRight ||
    placement === Position.TopCenter
  ) {
    popRef.style.bottom = `${documentHeight - triggerRect.top + offsetInPx}px`;
    popRef.style.top = "";
  } else if (
    placement === Position.BottomLeft ||
    placement === Position.BottomRight ||
    placement === Position.BottomCenter
  ) {
    popRef.style.top = `${triggerRect.bottom + offsetInPx}px`;
    popRef.style.bottom = "";
  }

  if (placement === Position.Right) {
    popRef.style.left = `${triggerRect.right + offsetInPx}px`;
  } else if (placement === Position.Left) {
    popRef.style.right = `${documentWidth - triggerRect.left + offsetInPx}px`;
  } else if (
    placement === Position.TopCenter ||
    placement === Position.BottomCenter
  ) {
    popRef.style.left = `${triggerRect.left - (popRect.width / 2 - triggerRect.width / 2)}px`;
  }
  popRect = popRef.getBoundingClientRect();
  if (popRect.width > documentWidth) {
    popRef.style.width = `${documentWidth - 12}px`;
  }
  console.log({
    triggerRect,
    popRect,
    placement,
    documentWidth,
    documentHeight
  });
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
  const triggerRect = triggerRef.getBoundingClientRect();
  popRef.style.display = "block";
  popRef.style.opacity = "0";
  popRef.style.position = "absolute";
  popRef.style.zIndex = "100";
  popRef.style.top = "";
  popRef.style.bottom = "";
  popRef.style.left = "";
  popRef.style.right = "";
  switch (placement) {
    case Position.TopCenter:
      popRef.style.bottom = `${triggerRect.height + offsetInPx}px`;
      break;
    case Position.BottomCenter:
      popRef.style.top = `${triggerRect.height + offsetInPx}px`;
      break;
    case Position.Left:
      popRef.style.right = `${triggerRect.width + offsetInPx}px`;
      break;
    case Position.Right:
      popRef.style.left = `${triggerRect.width + offsetInPx}px`;
      break;
  }
  // console.log("absolute positioning",{ triggerRect, popRect, placement });
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

/**
 * A sveltekit goto() equivalent
 *
 * Note: using this instead of sveltekit's goto() because extension projects do not have access to sveltekit's goto() function
 * @param path
 * @param queryParams
 */
export function goto(path: string) {
  window.dispatchEvent(
    new CustomEvent(GlobalEvent.CUSTOM_NAVIGATION, { detail: path })
  );
}

/**
 * TODO - test the reliability of this function
 * @returns true if the current environment is an extension environment
 */
export function isExtensionEnvironment() {
  // console.log({
  //   protocol: window.location.protocol,
  //   typeofchrome: typeof chrome,
  //   typeofbrowser: typeof (window as any).browser,
  //   typeofplasmo: typeof (window as any).__plasmo
  // });
  if (typeof chrome !== "undefined" && chrome?.runtime?.id) {
    // console.log("chrome", chrome.runtime.id);
    return true;
  }

  if (typeof (window as any).browser !== "undefined" && (window as any).browser.runtime?.id) {
    return true;
  }

  if (typeof (window as any).__plasmo !== "undefined") {
    return true;
  }

  if (
    window.location.protocol === "chrome-extension:" ||
    window.location.protocol === "moz-extension:"
  ) {
    return true;
  }

  return false;
}
