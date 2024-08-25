import { KeyValueStore } from "$lib/client/components/resourceStores/kv.store";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { appStore } from "$lib/client/stores/app.store";
import { get } from "svelte/store";
import type {
  IKeyboardShortcut,
  IKeyboardShortcutsStore
} from "./shortcut.type";
import { logger } from "../debug/logger.client";
import { resolveModifiers } from "./shortcut.utils";

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
    // const tempKeyMap = {
    //   TOGGLE_SIDEBAR: {
    //     key: "q"
    //   },
    //   focus: {
    //     key: "f"
    //   },
    //   goal: {
    //     key: "g"
    //   },
    //   analytics: {
    //     key: "a"
    //   },
    //   journal: {
    //     key: "j"
    //   },
    //   START_FOCUS_SESSION: {
    //     key: "s",
    //     modifiers: ["Shift"]
    //   },
    //   FINISH_FOCUS_SESSION: {
    //     key: "f",
    //     modifiers: ["Shift"]
    //   }
    // };
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

  /**
   * Resolves the shortcut for the given key and modifiers.
   * @param key
   * @param modifiers
   */
  resolveShortcut(event: KeyboardEvent) {
    const key = event.key;
    const modifiers = resolveModifiers(event);
    const keyMap = this.fecthKeyMap();
    const shortcut = keyMap.find((s: any) => {
      if (s.key.toLowerCase() !== key.toLowerCase()) return false;
      if (s.modifiers && s.modifiers.length !== modifiers.length) return false;
      return (
        (s.modifiers && s.modifiers.every((m: any) => modifiers.includes(m))) ||
        (!s.modifiers && modifiers.length === 0)
      );
    });
    logger.log({ key, modifiers, shortcut, keyMap });
    return { shortcut, modifiers };
  }
}

export const keyboardShortcuts = new KeyboardShortcuts();
