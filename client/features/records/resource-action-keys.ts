import { derived } from "svelte/store";
import type {
  IContextMenu,
  IContextMenuItem
} from "@21n/ui/elements/contextMenu/context-menu.type";
import { KeyboardKey } from "@21n/ui/elements/keyboard/keyboard.type";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
import { isKeyTargetPane } from "@nucleum/shell/shortcuts/page-keys";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";

/** Menu item values that run with a single key while a resource is open. */
export const RESOURCE_ACTION_KEYS: Readonly<Record<string, string>> = {
  star: "s",
  [ResourceActionType.EDIT]: "e",
  [ResourceActionType.TOGGLE_READ_MODE]: "r",
  [GlobalEvent.FOCUS_MODE]: "f",
  [ResourceActionType.LINK]: "l",
  addToCollection: "c",
  "open-in-full-screen": "z",
  "open-as-split": "b",
  [ResourceActionType.ARCHIVE]: "a",
  [ResourceActionType.UNARCHIVE]: "a",
  [ResourceActionType.DELETE]: KeyboardKey.BACKSPACE,
  [ResourceActionType.RESTORE]: KeyboardKey.BACKSPACE,
  [ResourceActionType.UNLINK]: "u"
};

/** Menu item values whose key asks for confirmation before running. */
export const CONFIRMED_RESOURCE_ACTIONS: ReadonlySet<string> = new Set([
  ResourceActionType.DELETE
]);

/**
 * Returns the single key for a resource menu item value, if it has one. Only
 * the map's own entries count, so a value such as "toString" has no key.
 */
export function resolveResourceActionKey(
  value: IContextMenuItem["value"] | undefined
): string | undefined {
  if (value == null) return undefined;
  const name = String(value);
  return Object.hasOwn(RESOURCE_ACTION_KEYS, name)
    ? RESOURCE_ACTION_KEYS[name]
    : undefined;
}

/** Copies a resource menu with each item's single key set as its hint. */
export function withResourceActionKeys(menu: IContextMenu): IContextMenu {
  return menu.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const hotKey = resolveResourceActionKey(item.value);
      return hotKey ? { ...item, hotKey } : item;
    })
  }));
}

/**
 * The registered resource actions whose single keys run now: the super bar's
 * active registration while its pane is the key target. Letter hints follow
 * it, so a hint never shows for a key that will not run, such as the actions
 * of a split resource while the user works in Calendar beside it.
 */
export const keyedContextActions = derived(
  [
    contextActions.active,
    contextZone.activePaneId,
    contextZone.pane,
    contextZone.visibleLayers
  ],
  ([entry]) => (entry && isKeyTargetPane(entry.pane) ? entry : undefined)
);
