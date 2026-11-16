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
