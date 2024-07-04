import { Position } from "$lib/client/types/direction.enum";
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
  location: Position = Position.Bottom,
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
    if (placement === Position.TopLeft) placement = Position.BottomLeft;
    else if (placement === Position.TopRight)
      placement = Position.BottomRight;
    else if (placement === Position.Top) placement = Position.Bottom;
  }
  if (documentHeight - triggerRect.bottom < popRect.height) {
    if (placement === Position.Bottom) placement = Position.Top;
    else if (placement === Position.BottomLeft) placement = Position.TopLeft;
    else if (placement === Position.BottomRight)
      placement = Position.TopRight;
  }
  if (documentWidth - triggerRect.right < popRect.width) {
    if (placement === Position.Right) placement = Position.Left;
    if (placement === Position.Bottom) placement = Position.BottomRight;
    if (placement === Position.Top) placement = Position.TopRight;
  }
  if (triggerRect.left < popRect.width) {
    if (placement === Position.Left) placement = Position.Right;
    if (placement === Position.Bottom) placement = Position.BottomLeft;
    if (placement === Position.Top) placement = Position.TopLeft;
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
    placement === Position.Top
  ) {
    popRef.style.bottom = `${documentHeight - triggerRect.top + offsetInPx}px`;
    popRef.style.top = "";
  } else if (
    placement === Position.BottomLeft ||
    placement === Position.BottomRight ||
    placement === Position.Bottom
  ) {
    popRef.style.top = `${triggerRect.bottom + offsetInPx}px`;
    popRef.style.bottom = "";
  }

  if (placement === Position.Right) {
    popRef.style.left = `${triggerRect.right + offsetInPx}px`;
  } else if (placement === Position.Left) {
    popRef.style.right = `${documentWidth - triggerRect.left + offsetInPx}px`;
  } else if (placement === Position.Top || placement === Position.Bottom) {
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

/**
 * A sveltekit goto() equivalent
 * 
 * Note: using this instead of sveltekit's goto() because extension projects do not have access to sveltekit's goto() function
 * @param path 
 * @param queryParams 
 */
export function goto(path: string, queryParams: Record<string, string> = {}) {
  const url = new URL(path, window.location.origin);
  for (const key in queryParams) {
    url.searchParams.set(key, queryParams[key]);
  }
  window.location.href = url.toString();
}

/**
 * TODO - test the reliability of this function
 * @returns true if the current environment is an extension environment
 */
export function isExtensionEnvironment() {
  console.log({protocol: window.location.protocol, typeofchrome: typeof chrome, typeofbrowser: typeof browser, typeofplasmo: typeof __plasmo})
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    return true;
  }
  
  if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.id) {
    return true;
  }
  
  if (typeof __plasmo !== 'undefined') {
    return true;
  }

  if (window.location.protocol === 'chrome-extension:' || 
      window.location.protocol === 'moz-extension:') {
    return true;
  }

  return false;
}