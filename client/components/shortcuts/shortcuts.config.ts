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
    key: "Space",
    code: "Space"
  },
  ACTIVATE_LINK_BOX: {
    key: "l",
    modifiers: [ModifierKey.META]
  },
  TOGGLE_FOCUS_SESSION: {
    key: "Space",
    code: "Space",
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
  }
};
