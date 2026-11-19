import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";
import { isViewKeyLayerOnFront } from "@nucleum/shell/shortcuts/front-layer";

/**
 * Moves the shown page `delta` views along unless a modal, dialog, popover or
 * `aria-modal` layer is in front; returns whether a view was selected.
 */
export function stepContextView(delta: number) {
  if (isViewKeyLayerOnFront()) return false;
  return contextZone.step(delta);
}

/**
 * Selects the shown page's view at `index` (zero based) unless a modal,
 * dialog, popover or `aria-modal` layer is in front; returns whether a view was selected.
 */
export function selectContextViewAt(index: number) {
  if (isViewKeyLayerOnFront()) return false;
  return contextZone.selectAt(index);
}
