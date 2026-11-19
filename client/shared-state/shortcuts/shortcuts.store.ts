import { Resource } from "@nucleum/datafn/resource.enum";
import { get, writable } from "svelte/store";
import type {
  IKeyboardShortcut,
  IKeyboardShortcutsStore
} from "@21n/ui/elements/keyboard/shortcut.type";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { resolveModifiers } from "@21n/ui/elements/keyboard/shortcut.utils";
import context from "@nucleum/client/runtime/context.store";
import { OperatingSystem } from "@nucleum/client/runtime/context.type";
import { requireShortcutHost } from "./shortcut-host";
import { replacer } from "@21n/shared-utils/json.utils";
import { datafn } from "@nucleum/datafn/datafn.store";
import { notifyElementShortcutsChanged } from "@21n/ui/hosts/shortcut-host";
import { isSingleKeyShortcutBlocked } from "@nucleum/shared-state/preferences/single-key-shortcuts";

const keyboardShortcutsSignal = datafn.kv.signal<IKeyboardShortcutsStore>(
  Resource.keyboardShortcuts,
  { defaultValue: {} }
);
const keyboardShortcutsLocal = writable<IKeyboardShortcutsStore>({});

keyboardShortcutsSignal.subscribe((value) => {
  keyboardShortcutsLocal.set(value ?? {});
  notifyElementShortcutsChanged();
});

export const keyboardShortcuts = {
  subscribe: keyboardShortcutsLocal.subscribe,
  get() {
    return get(keyboardShortcutsLocal);
  },
  saveShortcut(action: string, shortcut: IKeyboardShortcut) {
    return this.modify({ [action]: shortcut });
  },

  loader(data: IKeyboardShortcutsStore) {
    keyboardShortcutsLocal.set(data);
    return datafn.kv.set(Resource.keyboardShortcuts, data);
  },

  modify(n: Partial<IKeyboardShortcutsStore>) {
    keyboardShortcutsLocal.update(
      (current) => ({ ...current, ...n }) as IKeyboardShortcutsStore
    );
    return datafn.kv.merge(Resource.keyboardShortcuts, n);
  },

  fetchKeyMap(): (IKeyboardShortcut & { action: string })[] {
    let defaultKeyMap = requireShortcutHost().defaults;
    const ctx = get(context);
    if (ctx.os === OperatingSystem.WINDOWS) {
      defaultKeyMap = replacer(defaultKeyMap, { Meta: "Control" });
    }
    return Object.entries({ ...defaultKeyMap, ...this.get() })
      .map(([action, shortcut]) => ({
        action,
        prefix: shortcut?.prefix,
        key: shortcut?.key,
        code: shortcut?.code,
        modifiers: shortcut?.modifiers
      }))
      .filter((x: any) => x.key);
  },

  fetchConfiguratbleShortcuts() {
    const configurableShortcuts = requireShortcutHost().configurableActions();
    return this.fetchKeyMap().filter((x) =>
      configurableShortcuts?.includes(x.action)
    );
  },

  resolveShortcutForAction(action: string) {
    const keyMap = this.fetchKeyMap();
    const shortcut = keyMap.find((s: any) => s.action === action);
    return shortcut;
  },

  /**
   * Resolves the shortcut for a key press. With `prefix`, only chords started
   * by that prefix key match; without it, only shortcuts without a prefix do.
   * With `isRegistered`, shortcuts whose action it rejects (a command the
   * product does not register) are skipped.
   */
  resolveShortcut(
    event: KeyboardEvent,
    {
      prefix,
      isRegistered
    }: { prefix?: string; isRegistered?: (action: string) => boolean } = {}
  ) {
    if (!event?.key) return { shortcut: undefined, modifiers: [] };
    const modifiers = resolveModifiers(event);
    const keyMap = this.fetchKeyMap();
    const shortcut = keyMap.find(
      (s) =>
        this.checkShortcut(event, s, prefix) &&
        (isRegistered?.(s.action) ?? true)
    );
    logger.log({ event, modifiers, shortcut, keyMap });
    return { shortcut, modifiers };
  },

  checkShortcut(
    event: KeyboardEvent,
    shortcut: string | IKeyboardShortcut,
    prefix?: string
  ) {
    try {
      if (typeof shortcut === "string") {
        const keyMap = this.fetchKeyMap();
        const result = keyMap.find((s: any) => s.action === shortcut);
        if (!result) return false;
        shortcut = result;
      }
      const { key, code, modifiers } = shortcut;
      if (
        (shortcut.prefix?.toLowerCase() ?? undefined) !==
        (prefix?.toLowerCase() ?? undefined)
      )
        return false;
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
  },

  /**
   * Whether a key press matches a shortcut a page or component listens for,
   * as `checkShortcut` does, except that a press without Cmd, Ctrl or Option
   * matches nothing while single-key shortcuts are off.
   */
  checkPageShortcut(event: KeyboardEvent, shortcut: string | IKeyboardShortcut) {
    if (isSingleKeyShortcutBlocked(event)) return false;
    return this.checkShortcut(event, shortcut);
  },

  destroy() {
    keyboardShortcutsSignal.dispose();
  }
};

export type KeyboardShortcutsStoreType = typeof keyboardShortcuts;
