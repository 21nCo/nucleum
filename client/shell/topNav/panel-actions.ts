import type { Snippet } from "svelte";

/**
 * How a top bar panel action renders: `idle` while no grouped panel is open,
 * `expanded` while its own panel is open, and `compact` beside another
 * expanded action.
 */
export type TopNavPanelActionState = "idle" | "compact" | "expanded";

/** A top bar quick action that opens in the right panel. */
export type TopNavPanelAction = {
  action: string;
  content: Snippet<[TopNavPanelActionState]>;
};

/**
 * Whether the right panel opens beside the content, where an open grouped
 * panel action expands in the top bar. Portrait screens and constrained
 * widths show the panel as a sheet over the content instead.
 */
export function isTopNavPanelBeside(layout: {
  isPortrait: boolean;
  isConstrainedWidth: boolean;
}) {
  return !layout.isPortrait && !layout.isConstrainedWidth;
}

/**
 * Resolves the state of each grouped panel action: the action whose panel is
 * open expands when the right panel shows beside the content; the others turn
 * compact beside it. Without an expanded action every action stays idle.
 */
export function resolvePanelActionStates(
  actions: string[],
  openPanel: string | null | undefined,
  isPanelBeside: boolean
): Record<string, TopNavPanelActionState> {
  const expanded =
    isPanelBeside && openPanel && actions.includes(openPanel)
      ? openPanel
      : undefined;
  return Object.fromEntries(
    actions.map((action) => [
      action,
      expanded === action ? "expanded" : expanded ? "compact" : "idle"
    ])
  );
}

/**
 * Side borders of the expanded action, by its position in the group: a right
 * border for the first, both sides for a middle one, a left border for the
 * last.
 */
export function resolveExpandedBorderClass(index: number, count: number) {
  if (count <= 1) return "";
  if (index === 0) return "border-r";
  if (index === count - 1) return "border-l";
  return "border-x";
}
