import { detectTouchDevice } from "@21n/shared-utils/browser-platform";

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

export function hasActivePopovers(): boolean {
  const popovers = document.querySelectorAll("div.popover");
  return Array.from(popovers).some((popover) => {
    const element = popover as HTMLElement;
    return getComputedStyle(element).display !== "none";
  });
}

export function resolveHoverState(event: MouseEvent | FocusEvent) {
  const isTouchDevice = detectTouchDevice();
  return (
    !isTouchDevice && (event.type === "mouseover" || event.type === "focus")
  );
}

export function resolveDialogOnFront() {
  const dialogs = Array.from(document.querySelectorAll("dialog[open]"));
  if (dialogs.length === 0) {
    return null;
  }
  return dialogs[dialogs.length - 1];
}

export function resolveModalOnFront() {
  const modals = Array.from(document.querySelectorAll("[data-blank-modal]"));
  if (modals.length === 0) {
    return null;
  }
  return modals[modals.length - 1];
}

export function getEventPath(event: Event): EventTarget[] {
  let path: EventTarget[] = [];
  const target = event.target;
  if (target) {
    path.push(target);
  }
  let currentTarget = target instanceof Node ? target.parentNode : null;
  while (currentTarget) {
    path.push(currentTarget);
    currentTarget = currentTarget.parentNode;
  }
  if (path.indexOf(document) === -1) {
    path.push(document);
  }
  if (path.indexOf(window) === -1) {
    path.push(window);
  }
  return path;
}
