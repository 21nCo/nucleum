import { IObservableStoreSubject } from "$lib/client/types/data.type";
import { ModifierKey } from "$lib/client/types/keyboard.type";

export type IKeyboardShortcut = {
  key: string;
  modifiers: ModifierKey[];
};

export type IKeyboardShortcutsStore = IObservableStoreSubject & {
  [key: string]: IKeyboardShortcut;
};
