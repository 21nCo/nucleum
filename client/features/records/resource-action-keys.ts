import type {
  IContextMenu,
  IContextMenuItem
} from "@21n/ui/elements/contextMenu/context-menu.type";
import { KeyboardKey } from "@21n/ui/elements/keyboard/keyboard.type";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";

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

/** Returns the single key for a resource menu item value, if it has one. */
export function resolveResourceActionKey(
  value: IContextMenuItem["value"]
): string | undefined {
  return value == null ? undefined : RESOURCE_ACTION_KEYS[String(value)];
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
