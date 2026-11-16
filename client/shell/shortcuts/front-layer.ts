import {
  resolveDialogOnFront,
  resolveModalOnFront
} from "@21n/ui/actions/interaction-dom";

/** Whether an open popover is visible and takes pointer input. */
export function hasOpenPopover() {
  return Array.from(document.querySelectorAll(".popover")).some(
    (element) =>
      !element.classList.contains("pointer-events-none") &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== "hidden"
  );
}

/**
 * Whether a modal, dialog or popover is in front, so page-level keys such as
 * Escape and the context view keys leave it to handle the key.
 */
export function isLayerOnFront() {
  return !!(
    resolveModalOnFront() ||
    resolveDialogOnFront() ||
    hasOpenPopover()
  );
}

/**
 * Whether an element marked `aria-modal="true"` is shown, such as the right
 * panel sheet at a narrow width, which makes the page behind it inert. One
 * that is hidden, inert or inside a hidden or inert ancestor is not in front.
 */
export function hasAriaModalOnFront() {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[aria-modal="true"]')
  ).some(isShown);
}

/**
 * Whether an element is shown: not hidden, inert, `visibility: hidden` or
 * inside an ancestor with `display: none`.
 */
export function isShown(element: HTMLElement) {
  if (element.closest("[hidden], [inert]")) return false;
  if (getComputedStyle(element).visibility === "hidden") return false;
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    if (getComputedStyle(node).display === "none") return false;
  }
  return true;
}

/**
 * Whether the context view keys (Option arrows and 1 to 9) must leave the
 * shown page alone: a modal, dialog, popover or `aria-modal` layer is in
 * front. Escape keeps `isLayerOnFront`, so a sheet still closes on Escape.
 */
export function isViewKeyLayerOnFront() {
  return isLayerOnFront() || hasAriaModalOnFront();
}
