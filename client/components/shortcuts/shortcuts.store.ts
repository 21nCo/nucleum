import { KeyValueStore } from "$lib/client/components/resourceStores/kv.store";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { appStore } from "$lib/client/stores/app.store";
import { get } from "svelte/store";
import type {
  IKeyboardShortcut,
  IKeyboardShortcutsStore
} from "./shortcut.type";

class KeyboardShortcuts extends KeyValueStore<IKeyboardShortcutsStore> {
  constructor() {
    super(
      Resource.keyboardShortcuts,
      {},
      {
        refreshOnAppear: true
      }
    );
  }
  saveShortcut(action: string, shortcut: IKeyboardShortcut) {
    return this.modify({ [action]: shortcut });
  }
  fecthKeyMap(): (IKeyboardShortcut & { action: string })[] {
    const defaultKeyMap = get(appStore)?.appData?.shortcuts;
    return Object.entries({ ...defaultKeyMap, ...this.get() })
      .map(([action, shortcut]) => ({
        action,
        key: shortcut?.key,
        modifiers: shortcut?.modifiers
      }))
      .filter((x: any) => x.key);
  }
  fetchConfiguratbleShortcuts() {
    const configurableShortcuts = get(appStore)?.appData?.configurableShortcuts;
    return this.fecthKeyMap().filter((x) =>
      configurableShortcuts?.includes(x.action)
    );
  }
}

export const keyboardShortcuts = new KeyboardShortcuts();
