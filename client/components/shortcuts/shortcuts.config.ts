import { KeyboardKey, ModifierKey } from "@21n/types/keyboard.type";
import type { IKeyboardShortcut } from "@21n/components/shortcuts/shortcut.type";

export const shortcutsConfig: Record<string, IKeyboardShortcut> = {
  calendar: {
    key: "c"
  },
  library: {
    key: "l"
  },
  focus: {
    key: "f"
  },
  focusModal: {
    key: "f",
    modifiers: [ModifierKey.SHIFT]
  },
  graph: {
    key: "g"
  },
  overview: {
    key: "o"
  },
  create: {
    key: "n"
  },
  node_create: {
    key: "p"
  },
  TOGGLE_SIDEBAR: {
    key: "q"
  },
  CMD: {
    key: "p",
    modifiers: [ModifierKey.META, ModifierKey.SHIFT]
  },
  EDIT_MODE: {
    key: "e",
    modifiers: [ModifierKey.META]
  },
  ACTIVATE_SEARCH_BOX: {
    key: KeyboardKey.SPACE,
    code: KeyboardKey.SPACE
  },
  ACTIVATE_LINK_BOX: {
    key: "l",
    modifiers: [ModifierKey.META]
  },
  TOGGLE_FOCUS_SESSION: {
    key: KeyboardKey.SPACE,
    code: KeyboardKey.SPACE,
    modifiers: [ModifierKey.META, ModifierKey.ALT]
  },
  "global-search": {
    key: "k",
    modifiers: [ModifierKey.META]
  },
  GO_BACK: {
    key: "b",
    modifiers: [ModifierKey.META, ModifierKey.SHIFT]
  },
  GO_FORWARD: {
    key: "f",
    modifiers: [ModifierKey.META, ModifierKey.SHIFT]
  },
  CLOSE: {
    key: KeyboardKey.ESCAPE,
    code: KeyboardKey.ESCAPE,
    modifiers: [ModifierKey.META]
  }
};
