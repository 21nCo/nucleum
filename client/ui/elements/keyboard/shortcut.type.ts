import { type ModifierKey } from "@21n/ui/elements/keyboard/keyboard.type";

export type IKeyboardShortcut = {
  /**
   * Key pressed first, on its own, to start a chord: "g" makes the
   * shortcut G then key.
   */
  prefix?: string;
  key: string;
  code?: string;
  modifiers?: ModifierKey[];
};

export type IKeyboardShortcutsStore = {
  [key: string]: IKeyboardShortcut;
};
