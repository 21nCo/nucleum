import { resolveModalOnFront } from "@21n/ui/actions/interaction-dom";
import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";
import { isViewKeyLayerOnFront } from "@nucleum/shell/shortcuts/front-layer";

/**
 * Moves the vertical list of the page in front `delta` items along, wrapping
 * at both ends: the list inside the front modal while a modal is open,
 * otherwise the shown page's list unless a dialog, popover or `aria-modal`
 * layer is in front. Returns whether an item was selected.
 */
export function stepListItem(delta: number) {
  const isModalOpen = !!resolveModalOnFront();
  if (!isModalOpen && isViewKeyLayerOnFront()) return false;
  return contextZone.stepSub(delta, { axis: "vertical", isModalOpen });
}
