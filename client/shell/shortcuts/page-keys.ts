import {
  isTextElement,
  resolveDialogOnFront,
  resolveModalOnFront
} from "@21n/ui/actions/interaction-dom";

function hasOpenPopover() {
  return Array.from(document.querySelectorAll(".popover")).some(
    (element) =>
      !element.classList.contains("pointer-events-none") &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== "hidden"
  );
}

/**
 * Whether a key press may run a page's single-key action: not handled yet,
 * not held down, no Cmd, Ctrl or Option (and no Shift unless `allowShift`),
 * not typed into a field or editor, and no modal, dialog or popover in front.
 */
export function isPlainPageKey(
  event: KeyboardEvent,
  options: { allowShift?: boolean } = {}
) {
  if (event.defaultPrevented || event.repeat) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.shiftKey && !options.allowShift) return false;
  if (isTextElement(event.target)) return false;
  return !(resolveModalOnFront() || resolveDialogOnFront() || hasOpenPopover());
}
