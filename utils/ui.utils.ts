import { get } from "svelte/store";
import { windowObject } from "../stores/app.store";
import { Direction } from "../types/direction.enum";

function documentDimensions() {
  let documentWidth = get(windowObject).documentWidth;
  const rawDocumentWidth = window.innerWidth;
  // console.log({ triggerRect, documentWidth, rawDocumentWidth, popRect });
  if (documentWidth === 0) {
    documentWidth = rawDocumentWidth;
  }
  let documentHeight = get(windowObject).documentHeight;
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
    popRef.style.top = `${triggerRect.top}px`;
  } else if (location === Direction.Left) {
    popRef.style.right = `${documentWidth - triggerRect.left + 2}px`;
    popRef.style.top = `${triggerRect.top}px`;
  } else if (location === Direction.Up) {
    popRef.style.bottom = `${documentHeight - triggerRect.top + 2}px`;
  } else if (location === Direction.Down) {
    popRef.style.top = `${triggerRect.bottom + 2}px`;
  }
  console.log({
    triggerRect,
    popRect,
    location,
    documentWidth,
    documentHeight
  });
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
