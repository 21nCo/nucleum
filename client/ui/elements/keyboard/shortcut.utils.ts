import {
  KeyboardKey,
  ModifierKey
} from "@21n/ui/elements/keyboard/keyboard.type";
import type { IKeyboardShortcut } from "@21n/ui/elements/keyboard/shortcut.type";
import { elementLogger as logger } from "@21n/ui/environment/element-environment.store";

export function resolveShortcutText(params: {
  key: string;
  os: string;
  modifiers?: ModifierKey[];
  prefix?: string;
}): string {
  const { key, modifiers, os, prefix } = params;
  if (prefix) {
    return `${prefix.toUpperCase()} ${resolveShortcutText({ key, modifiers, os })}`;
  }
  let modifierLabels: string[] = [];
  logger.log({ key, modifiers, os });
  if (modifiers && modifiers.length > 0) {
    modifierLabels = modifiers.map((x) => {
      if (x === ModifierKey.META) {
        if (os === "MACOS" || os === "IOS") {
          return "⌘";
        } else {
          return "Win";
        }
      } else if (x === ModifierKey.CTRL) {
        return "Ctrl";
      } else return x;
    });
  }
  if (modifierLabels.length === 0) return key.toUpperCase();
  return modifierLabels.join(" + ") + (key ? " + " + key.toUpperCase() : "");
}

export function resolveModifiers(event: KeyboardEvent) {
  let modifiers: ModifierKey[] = [];
  if (event.metaKey) {
    modifiers.push(ModifierKey.META);
  }
  if (event.ctrlKey) {
    modifiers.push(ModifierKey.CTRL);
  }
  if (event.altKey) {
    modifiers.push(ModifierKey.ALT);
  }
  if (event.shiftKey) {
    modifiers.push(ModifierKey.SHIFT);
  }
  return modifiers;
}

/** Keys that stay on inside a focused control whatever the single-key setting. */
const CONTROL_KEYS = new Set<string>([
  KeyboardKey.ESCAPE,
  KeyboardKey.ENTER,
  KeyboardKey.TAB,
  KeyboardKey.ARROW_LEFT,
  KeyboardKey.ARROW_RIGHT,
  KeyboardKey.ARROW_UP,
  KeyboardKey.ARROW_DOWN
]);

/**
 * Whether a shortcut runs on one key press without Cmd, Ctrl or Option (Shift
 * allowed), or is a chord such as G then C, so it is off while single-key
 * shortcuts are off. Escape, Enter, Tab and arrow keys are not: they stay on
 * inside focused controls.
 */
export function isSingleKeyShortcut(shortcut: IKeyboardShortcut) {
  if (shortcut.prefix) return true;
  const modifiers = shortcut.modifiers ?? [];
  if (
    modifiers.includes(ModifierKey.META) ||
    modifiers.includes(ModifierKey.CTRL) ||
    modifiers.includes(ModifierKey.ALT)
  )
    return false;
  return !CONTROL_KEYS.has(shortcut.key);
}
