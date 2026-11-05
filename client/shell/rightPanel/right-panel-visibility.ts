import { getContext, setContext } from "svelte";
import type { Readable } from "svelte/store";
import { resolveContextZonePaneVisibility } from "@nucleum/shell/topNav/contextZone/context-zone";

const RIGHT_PANEL_VISIBILITY = Symbol("right-panel-visibility");

/**
 * Shares, with the tool a right panel hosts, whether that panel is visible.
 * The panel stays mounted but hidden while a layer is drawn over it.
 */
export function provideRightPanelVisibility(isVisible: Readable<boolean>) {
  setContext(RIGHT_PANEL_VISIBILITY, isVisible);
}

/**
 * Whether the layer hosting the calling component is visible: the right
 * panel's visibility inside a right panel, otherwise whether no other layer
 * covers the base page, page, split or overlay it renders in. Tools hidden
 * under another layer skip global shortcuts. Outside every layer, such as in
 * a modal, it is always visible.
 */
export function resolveHostVisibility(): Readable<boolean> {
  return (
    getContext<Readable<boolean> | undefined>(RIGHT_PANEL_VISIBILITY) ??
    resolveContextZonePaneVisibility()
  );
}
