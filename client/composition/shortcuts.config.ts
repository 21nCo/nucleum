import { KeyboardKey, ModifierKey } from "@21n/ui/elements/keyboard/keyboard.type";
import type { IKeyboardShortcut } from "@21n/ui/elements/keyboard/shortcut.type";
import { Action } from "@nucleum/client/config/action.enum";
import { PointronAction } from "@nucleum/client/config/focus-action.enum";
import { MemotronAction } from "@nucleum/features/memory/memory-action.enum";
import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";

const GO = "g";

export const shortcutsConfig: Record<string, IKeyboardShortcut> = {
  [Action.HOME]: {
    prefix: GO,
    key: "h"
  },
  [Action.CALENDAR]: {
    prefix: GO,
    key: "c"
  },
  [Action.OVERVIEW]: {
    prefix: GO,
    key: "o"
  },
  [Action.LIBRARY]: {
    prefix: GO,
    key: "l"
  },
  [Action.SETTINGS]: {
    prefix: GO,
    key: "s"
  },
  node_create: {
    prefix: GO,
    key: "p"
  },
  [PointronAction.FOCUS]: {
    prefix: GO,
    key: "f"
  },
  [Action.HOT_KEYS]: {
    key: "?",
    modifiers: [ModifierKey.SHIFT]
  },
  [Action.TOGGLE_SIDEBAR]: {
    key: "["
  },
  [Action.NAVIGATOR]: {
    key: "/"
  },
  [Action.OPEN_NAVIGATOR]: {
    key: "/",
    modifiers: [ModifierKey.META]
  },
  [Action.CMD]: {
    key: "k",
    modifiers: [ModifierKey.META]
  },
  [Action.EDIT_MODE]: {
    key: "e",
    modifiers: [ModifierKey.META]
  },
  [GlobalEvent.ACTIVATE_SEARCH_BOX]: {
    key: KeyboardKey.SPACE,
    code: KeyboardKey.SPACE
  },
  [MemotronAction.ACTIVATE_LINK_BOX]: {
    key: "l",
    modifiers: [ModifierKey.META]
  },
  [PointronAction.TOGGLE_FOCUS_SESSION]: {
    key: KeyboardKey.SPACE,
    code: KeyboardKey.SPACE,
    modifiers: [ModifierKey.META, ModifierKey.ALT]
  },
  [Action.SEARCH]: {
    key: "k",
    modifiers: [ModifierKey.META, ModifierKey.SHIFT]
  },
  [Action.GO_BACK]: {
    key: "b",
    modifiers: [ModifierKey.META, ModifierKey.SHIFT]
  },
  [Action.GO_FORWARD]: {
    key: "f",
    modifiers: [ModifierKey.META, ModifierKey.SHIFT]
  },
  [Action.CLOSE]: {
    key: KeyboardKey.ESCAPE,
    code: KeyboardKey.ESCAPE,
    modifiers: [ModifierKey.META]
  },
  [GlobalEvent.ENTER]: {
    key: KeyboardKey.ENTER,
    modifiers: [ModifierKey.META]
  }
};
