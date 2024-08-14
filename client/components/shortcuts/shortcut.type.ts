import { IObservableStoreSubject } from "$lib/client/types/data.type";

export type IKeyboardShortcut = {
  key: string;
  modifiers: string[];
};

export type IKeyboardShortcutsStore = IObservableStoreSubject & {
  [key: string]: IKeyboardShortcut;
};
