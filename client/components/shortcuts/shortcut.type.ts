import { ModifierKey } from "$lib/client/types/keyboard.type";

export type IKeyboardShortcut = {
  key: string;
  code?: string;
  modifiers?: ModifierKey[];
};

export type IKeyboardShortcutsStore = {
  [key: string]: IKeyboardShortcut;
};
