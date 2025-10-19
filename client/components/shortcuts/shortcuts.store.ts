import { KeyValueStore } from "@21n/components/flux/resourceStores/kv.store";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { appStore } from "@21n/stores/app.store";
import { get } from "svelte/store";
import type {
  IKeyboardShortcut,
  IKeyboardShortcutsStore
} from "@21n/components/shortcuts/shortcut.type";
import { logger } from "@21n/components/debug/logger.client";
import { resolveModifiers } from "@21n/components/shortcuts/shortcut.utils";
import context from "@21n/stores/context.store";
import { OperatingSystem } from "@21n/types/context.type";
import { shortcutsConfig } from "@21n/components/shortcuts/shortcuts.config";
import { replacer } from "@21n/shared-utils/json.utils";

export type KeyboardShortcutsStoreType = InstanceType<typeof KeyboardShortcuts>;

class KeyboardShortcuts extends KeyValueStore<IKeyboardShortcutsStore> {
  constructor() {
    super(Resource.keyboardShortcuts, {});
  }

  saveShortcut(action: string, shortcut: IKeyboardShortcut) {
    return this.modify({ [action]: shortcut });
  }

  fetchKeyMap(): (IKeyboardShortcut & { action: string })[] {
    let defaultKeyMap = shortcutsConfig;
    const ctx = get(context);
    if (ctx.os === OperatingSystem.WINDOWS) {
      defaultKeyMap = replacer(defaultKeyMap, { Meta: "Control" });
    }
    return Object.entries({ ...defaultKeyMap, ...this.get() })
      .map(([action, shortcut]) => ({
        action,
        key: shortcut?.key,
        code: shortcut?.code,
        modifiers: shortcut?.modifiers
      }))
      .filter((x: any) => x.key);
  }

  fetchConfiguratbleShortcuts() {
    const configurableShortcuts = get(appStore)?.appData?.configurableShortcuts;
    return this.fetchKeyMap().filter((x) =>
      configurableShortcuts?.includes(x.action)
    );
  }

  resolveShortcutForAction(action: string) {
    const keyMap = this.fetchKeyMap();
    const shortcut = keyMap.find((s: any) => s.action === action);
    return shortcut;
  }

  /**
   * Resolves the shortcut for the given key and modifiers.
   * @param key
   * @param modifiers
   */
  resolveShortcut(event: KeyboardEvent) {
    if (!event?.key) return { shortcut: undefined, modifiers: [] };
    const modifiers = resolveModifiers(event);
    const keyMap = this.fetchKeyMap();
    const shortcut = keyMap.find((s: any) => {
      return this.checkShortcut(event, s);
    });
    logger.log({ event, modifiers, shortcut, keyMap });
    return { shortcut, modifiers };
  }

  checkShortcut(event: KeyboardEvent, shortcut: string | IKeyboardShortcut) {
    try {
      if (typeof shortcut === "string") {
        const keyMap = this.fetchKeyMap();
        const result = keyMap.find((s: any) => s.action === shortcut);
        if (!result) return false;
        shortcut = result;
      }
      const { key, code, modifiers } = shortcut;
      const eventKey = event.key;
      const eventCode = event.code;
      const eventModifiers = resolveModifiers(event);
      if (code && code.toLowerCase() !== eventCode.toLowerCase()) return false;
      else if (!code && key.toLowerCase() !== eventKey.toLowerCase())
        return false;
      if (modifiers && modifiers.length !== eventModifiers.length) return false;
      return (
        (modifiers &&
          modifiers.every((m: any) => eventModifiers.includes(m))) ||
        (!modifiers && eventModifiers.length === 0)
      );
    } catch (error) {
      logger.error({ error, shortcut, event });
      return false;
    }
  }
}

export const keyboardShortcuts = KeyboardShortcuts.resolve(
  Resource.keyboardShortcuts
);
