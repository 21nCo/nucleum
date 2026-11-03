/** Duration of the panel action group's layout transition, matching the right panel. */
export const PANEL_ACTION_TRANSITION_MS = 300;

/** Easing of the panel action group's layout transition. */
export const PANEL_ACTION_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

/** Whether the user asked the system to reduce motion. */
export function isReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Keyframes that move a box from its previous rect to its current one, for a
 * FLIP transition: the offset and width it starts from, ending at rest.
 */
export function resolveFlipKeyframes(
  previous: { left: number; width: number },
  current: { left: number; width: number }
): Keyframe[] | undefined {
  const dx = previous.left - current.left;
  if (Math.abs(dx) < 0.5 && Math.abs(previous.width - current.width) < 0.5)
    return undefined;
  return [
    {
      transform: `translateX(${dx}px)`,
      width: `${previous.width}px`,
      minWidth: `${previous.width}px`
    },
    {
      transform: "translateX(0)",
      width: `${current.width}px`,
      minWidth: `${current.width}px`
    }
  ];
}
