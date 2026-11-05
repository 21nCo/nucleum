/** Width the top bar needs free to show toasts beside the quick actions. */
export const TOAST_BESIDE_ACTIONS_MIN_WIDTH = 320;

/**
 * Whether toasts fit in the free space between the context zone's content
 * and the quick actions; otherwise they briefly replace the right zone.
 */
export function isToastBesideActions(
  zoneWidth: number,
  contentWidth: number,
  minWidth = TOAST_BESIDE_ACTIONS_MIN_WIDTH
) {
  return zoneWidth - contentWidth >= minWidth;
}
