import { resolveModalOnFront } from "@21n/ui/actions/interaction-dom";
import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";
import {
  hasOpenPopover,
  isShown,
  isViewKeyLayerOnFront
} from "@nucleum/shell/shortcuts/front-layer";

/**
 * Moves the vertical list of the page in front `delta` items along, wrapping
 * at both ends: while a modal is open, the list inside the front modal unless
 * a popover, dialog or `aria-modal` layer is over it; otherwise the shown
 * page's list unless a dialog, popover or `aria-modal` layer is in front.
 * Returns whether an item was selected.
 */
export function stepListItem(delta: number) {
  if (resolveModalOnFront())
    return contextZone.stepSub(delta, {
      axis: "vertical",
      isModalOpen: true,
      isOnFront: isInFrontModal
    });
  if (isViewKeyLayerOnFront()) return false;
  return contextZone.stepSub(delta, { axis: "vertical", isModalOpen: false });
}

/**
 * Whether `element` is in front inside a modal: the front modal holds it, no
 * popover is open, and no open dialog or shown `aria-modal` layer that does
 * not hold it is in front of it. Layers behind the modal are inert, so they
 * do not count; the modal's own dialog holds the element.
 */
export function isInFrontModal(element: Element) {
  if (!resolveModalOnFront()?.contains(element)) return false;
  if (hasOpenPopover()) return false;
  const isOver = (layer: Element) =>
    !layer.contains(element) && !layer.closest("[inert]");
  const dialogs = Array.from(document.querySelectorAll("dialog[open]"));
  const sheets = Array.from(
    document.querySelectorAll<HTMLElement>('[aria-modal="true"]')
  ).filter(isShown);
  return ![...dialogs, ...sheets].some(isOver);
}
