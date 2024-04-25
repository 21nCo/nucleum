import { get } from "svelte/store";
import view from "$lib/tidy/stores/view.store";
import { Direction } from "../types/direction.enum";
import { OS } from "../types/os.enum";

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

export function renderPopoverv2(
  parentRef: HTMLElement,
  popRef: HTMLElement,
  location: Direction = Direction.Down
) {
  const triggerRect = parentRef.getBoundingClientRect();
  popRef.style.display = "block";
  popRef.style.opacity = "0";
  let popRect = popRef.getBoundingClientRect();
  const { documentWidth, documentHeight } = documentDimensions();
  popRef.style.position = "fixed";
  //set z index
  popRef.style.zIndex = "100";
  if (
    location === Direction.BottomLeft &&
    documentHeight - triggerRect.bottom < popRect.height
  ) {
    location = Direction.TopLeft;
  } else if (
    location === Direction.TopLeft &&
    triggerRect.top < popRect.height
  ) {
    location = Direction.BottomLeft;
  } else if (
    location === Direction.Down &&
    documentHeight - triggerRect.bottom < popRect.height
  ) {
    location = Direction.Up;
  }
  if (location === Direction.BottomLeft) {
    popRef.style.left = `${triggerRect.left}px`;
    popRef.style.top = `${triggerRect.bottom + 2}px`;
  } else if (location === Direction.TopLeft) {
    popRef.style.left = `${triggerRect.left}px`;
    popRef.style.bottom = `${documentHeight - triggerRect.top + 2}px`;
  } else if (location === Direction.BottomRight) {
    popRef.style.right = `${documentWidth - triggerRect.right}px`;
    popRef.style.top = `${triggerRect.bottom + 2}px`;
  } else if (location === Direction.TopRight) {
    popRef.style.right = `${documentWidth - triggerRect.right}px`;
    popRef.style.bottom = `${documentHeight - triggerRect.top + 2}px`;
  } else if (location === Direction.Right) {
    popRef.style.left = `${triggerRect.right + 2}px`;
    // popRef.style.top = `${triggerRect.top}px`;
  } else if (location === Direction.Left) {
    popRef.style.right = `${documentWidth - triggerRect.left + 2}px`;
    popRef.style.top = `$-{triggerRect.top - triggerRect.height / 2}px`;
  } else if (location === Direction.Up) {
    popRef.style.bottom = `${documentHeight - triggerRect.top + 2}px`;
  } else if (location === Direction.Down) {
    popRef.style.top = `${triggerRect.bottom + 2}px`;
    popRef.style.left = `${triggerRect.left}px`;
    popRef.style.width = `${triggerRect.width}px`;
  }
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
    view.gotoPath(url.href);
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.delete(param);
  view.gotoPath(url.href);
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
