import { get } from "svelte/store";
import {
  isTextElement,
  resolveDialogOnFront,
  resolveModalOnFront
} from "@21n/ui/actions/interaction-dom";
import {
  contextZone,
  type ContextZonePane
} from "@nucleum/shell/topNav/contextZone/context-zone";

function isShown(element: Element) {
  return (
    element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== "hidden"
  );
}

/** Whether a sheet that blocks the page, such as a modal right panel, is open. */
function hasOpenModalSheet() {
  return Array.from(document.querySelectorAll('[aria-modal="true"]')).some(
    isShown
  );
}

/** Whether a popover, such as a context menu, is open in front of the page. */
export function hasOpenPopover() {
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
  return !hasLayerInFront();
}

/** Whether a modal, dialog, popover or modal sheet is in front of the page. */
export function hasLayerInFront() {
  return Boolean(
    resolveModalOnFront() ||
      resolveDialogOnFront() ||
      hasOpenPopover() ||
      hasOpenModalSheet()
  );
}

/**
 * Whether a pane's page keys should run: its layer is visible, the element is
 * not inside a covered (inert) part of the page, and it is the pane the user
 * works in when one is set.
 */
export function isKeyTargetPane(
  pane: ContextZonePane,
  element?: Element | null
) {
  if (element?.closest("[inert]")) return false;
  const visible = get(contextZone.visibleLayers);
  if (visible && !visible.has(pane.layer)) return false;
  const active = get(contextZone.activePaneId);
  return active === undefined || active === pane.id;
}
