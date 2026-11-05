import { getContext, setContext } from "svelte";
import { readable, type Readable } from "svelte/store";

const RIGHT_PANEL_VISIBILITY = Symbol("right-panel-visibility");

const alwaysVisible = readable(true);

/**
 * Shares, with the tool a right panel hosts, whether that panel is visible.
 * The panel stays mounted but hidden while a layer is drawn over it.
 */
export function provideRightPanelVisibility(isVisible: Readable<boolean>) {
  setContext(RIGHT_PANEL_VISIBILITY, isVisible);
}

/**
 * Whether the right panel hosting the calling component is visible. Tools
 * hidden under another layer skip global shortcuts. Outside a right panel it
 * is always visible.
 */
export function resolveRightPanelVisibility(): Readable<boolean> {
  return (
    getContext<Readable<boolean> | undefined>(RIGHT_PANEL_VISIBILITY) ??
    alwaysVisible
  );
}
