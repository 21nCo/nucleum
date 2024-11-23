import { ModifierKey } from "$lib/client/types/keyboard.type";
import { OperatingSystem } from "$lib/client/types/context.type";
import { logger } from "$lib/client/components/debug/logger.client";

export function resolveShortcutText(
  key: string,
  modifiers: ModifierKey[],
  os: OperatingSystem
) {
  let modifierLabels: string[] = [];
  logger.log({ key, modifiers, os });
  if (modifiers.length > 0) {
    modifierLabels = modifiers.map((x) => {
      if (x === ModifierKey.META) {
        if (os === OperatingSystem.MACOS || os === OperatingSystem.IOS) {
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
  return modifierLabels.join(" + ") + " + " + key.toUpperCase();
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
