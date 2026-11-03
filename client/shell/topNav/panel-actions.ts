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
  /**
   * Background class of the expanded tab, matching the panel it joins.
   * Defaults to the right panel background.
   */
  surfaceClass?: string;
};

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
