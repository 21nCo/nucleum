import { ModifierKey } from "$lib/client/types/keyboard.type";
import type { IKeyboardShortcut } from "./shortcut.type";

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
  graph: {
    key: "g"
  },
  analytics: {
    key: "a"
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
    key: "Space",
    code: "Space"
  },
  SAVE_CAPTURE_SHORTCUT: {
    key: "Enter",
    modifiers: [ModifierKey.META]
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
  }
};
