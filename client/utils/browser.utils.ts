import { get } from "svelte/store";
import view from "$lib/client/stores/view.store";
import { Direction } from "$lib/client/types/direction.enum";
import { OS } from "$lib/client/types/os.enum";
import { appStore } from "../stores/app.store";
import type { IPopoverRenderParams } from "../types/popover.type";

function documentDimensions() {
  let documentWidth = get(view).width;
  const rawDocumentWidth = window.innerWidth;
  // console.log({ triggerRect, documentWidth, rawDocumentWidth, popRect });
  if (documentWidth === 0) {
    documentWidth = rawDocumentWidth;
  }
  let documentHeight = get(view).height;
  const rawDocumentHeight = window.innerHeight;
  if (documentHeight === 0) {
    documentHeight = rawDocumentHeight;
  }
  return {
    documentWidth,
    documentHeight
  };
}

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
  _renderPopover({ ...params, triggerRect: rect, isSpanToTriggerWidth: false });
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
    location,
    isSpanToTriggerWidth,
    offsetInPx
  });
}

function _renderPopover(params: IPopoverRenderParams) {
  let { triggerRect, popRef, location, isSpanToTriggerWidth, offsetInPx } =
    params;
  popRef.style.display = "block";
  popRef.style.opacity = "0";
  let popRect = popRef.getBoundingClientRect();
  const { documentWidth, documentHeight } = documentDimensions();
  popRef.style.position = "fixed";
  //set z index
  popRef.style.zIndex = "100";

  if (triggerRect.top < popRect.height) {
    if (location === Direction.TopLeft) location = Direction.BottomLeft;
  }
  if (documentHeight - triggerRect.bottom < popRect.height) {
    if (location === Direction.Down) location = Direction.Up;
    else if (location === Direction.BottomLeft) location = Direction.TopLeft;
    else if (location === Direction.BottomRight) location = Direction.TopRight;
  }
  if (documentWidth - triggerRect.right < popRect.width) {
    if (location === Direction.Right) location = Direction.Left;
    if (location === Direction.Down) location = Direction.BottomRight;
    if (location === Direction.Up) location = Direction.TopRight;
  }
  if (location === Direction.BottomLeft) {
    popRef.style.left = `${triggerRect.left}px`;
    popRef.style.top = `${triggerRect.bottom + offsetInPx}px`;
  } else if (location === Direction.TopLeft) {
    popRef.style.left = `${triggerRect.left}px`;
    popRef.style.bottom = `${documentHeight - triggerRect.top + offsetInPx}px`;
  } else if (location === Direction.BottomRight) {
    popRef.style.right = `${documentWidth - triggerRect.right}px`;
    popRef.style.top = `${triggerRect.bottom + offsetInPx}px`;
  } else if (location === Direction.TopRight) {
    popRef.style.right = `${documentWidth - triggerRect.right}px`;
    popRef.style.bottom = `${documentHeight - triggerRect.top + offsetInPx}px`;
  } else if (location === Direction.Right) {
    popRef.style.left = `${triggerRect.right + offsetInPx}px`;
    // popRef.style.top = `${triggerRect.top}px`;
  } else if (location === Direction.Left) {
    popRef.style.right = `${documentWidth - triggerRect.left + offsetInPx}px`;
    popRef.style.top = `$-{triggerRect.top - triggerRect.height / 2}px`;
  } else if (location === Direction.Up) {
    popRef.style.bottom = `${documentHeight - triggerRect.top + offsetInPx}px`;
  } else if (location === Direction.Down) {
    popRef.style.top = `${triggerRect.bottom + offsetInPx}px`;
    popRef.style.left = `${triggerRect.left}px`;
  }
  if (isSpanToTriggerWidth) popRef.style.width = `${triggerRect.width}px`;
  // console.log({
  //   triggerRect,
  //   popRect,
  //   location,
  //   documentWidth,
  //   documentHeight
  // });
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

export function toggleSearchParam(
  param: string,
  value?: string | boolean | number
) {
  if (value !== undefined) {
    const url = new URL(window.location.href);
    url.searchParams.set(param, value.toString());
    appStore.gotoPath(url.href);
    return;
  }
  const url = new URL(window.location.href);
  if (!url.searchParams.get(param)) return;
  url.searchParams.delete(param);
  appStore.gotoPath(url.href);
}

export function detectSystemOS() {
  let os: OS;
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = userAgent ?? navigator.platform.toLowerCase();
  if (platform.includes("win")) {
    os = OS.WINDOWS;
  } else if (platform.includes("mac")) {
    os = OS.MAC;
  } else if (
    platform.includes("iphone") ||
    platform.includes("ipad") ||
    platform.includes("iOS")
  ) {
    os = OS.IOS;
  } else if (platform.includes("android")) {
    os = OS.ANDROID;
  } else {
    os = OS.OTHER;
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

export function resolveHoverState(event: MouseEvent | FocusEvent) {
  return event.type === "mouseover" || event.type === "focus";
}
