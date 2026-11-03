import { derived, writable } from "svelte/store";
import type {
  IContextMenu,
  IContextMenuItem
} from "@21n/ui/elements/contextMenu/context-menu.type";
import {
  contextZone,
  resolveContextZoneEntry,
  type ContextZonePane
} from "@nucleum/shell/topNav/contextZone/context-zone";

/** Context menu actions a resource page offers outside its own menu. */
export type ContextActionsRegistration = {
  /** Record id of the resource the actions apply to. */
  id: string;
  /** Resource type label, such as "node" or "collection". */
  resource: string;
  /** Resolves the same groups the resource's "..." menu shows. */
  resolve: () => IContextMenu;
  /** Called with the item value after an item runs, as the menu does. */
  onAction?: (value: IContextMenuItem["value"]) => void;
};

/** One registered set of contextual actions. */
export type ContextActionsEntry = ContextActionsRegistration & {
  key: number;
  pane: ContextZonePane;
};

const entries = writable<ContextActionsEntry[]>([]);
let nextKey = 0;

/**
 * Shell-owned registry of the context menu actions of open resource pages.
 * The super bar shows the actions of the pane the user worked in last,
 * otherwise those of the topmost pane, using the context zone's pane order and
 * ignoring layers the user cannot see.
 */
export const contextActions = {
  active: derived(
    [entries, contextZone.activePaneId, contextZone.visibleLayers],
    ([list, pane, visible]) => resolveContextZoneEntry(list, pane, visible)
  ),
  /** Registers a resource's actions for a pane; returns its unregister function. */
  register(pane: ContextZonePane, registration: ContextActionsRegistration) {
    const key = ++nextKey;
    const entry: ContextActionsEntry = Object.defineProperties(
      { key, pane } as ContextActionsEntry,
      {
        id: { get: () => registration.id, enumerable: true },
        resource: { get: () => registration.resource, enumerable: true },
        resolve: { get: () => registration.resolve, enumerable: true },
        onAction: { get: () => registration.onAction, enumerable: true }
      }
    );
    entries.update((list) => [...list, entry]);
    return () => entries.update((list) => list.filter((x) => x.key !== key));
  }
};
