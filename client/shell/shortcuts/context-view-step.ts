import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";
import { isLayerOnFront } from "@nucleum/shell/shortcuts/front-layer";

/**
 * Moves the shown page `delta` views along unless a modal, dialog or popover
 * is in front; returns whether a view was selected.
 */
export function stepContextView(delta: number) {
  if (isLayerOnFront()) return false;
  return contextZone.step(delta);
}

/**
 * Selects the shown page's view at `index` (zero based) unless a modal, dialog
 * or popover is in front; returns whether a view was selected.
 */
export function selectContextViewAt(index: number) {
  if (isLayerOnFront()) return false;
  return contextZone.selectAt(index);
}
