<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { isTextElement } from "$lib/client/utils/browser.utils";
  import { keyboardShortcuts } from "./shortcuts.store";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { KeyboardKey } from "$lib/client/types/keyboard.type";
  import { resolveModifiers } from "../settings/shortcuts/shortcut.utils";
  import { logger } from "$lib/client/components/debug/logger.client";

  function handleSystemShortcuts(event: KeyboardEvent) {
    if (event.key === KeyboardKey.ESCAPE || event.key === KeyboardKey.ENTER) {
      appEvents.publish(event.key.toString() as GlobalEvent);
      return true;
    }
  }
  const shortcutListener = (event: KeyboardEvent) => {
    logger.log({ event, at: "shortcutListener" });
    const target = event.target || event.srcElement;
    const isShortcutRunCompleted = handleSystemShortcuts(event);
    if (isTextElement(target)) return;
    if (isShortcutRunCompleted) return;
    let modifiers = [];
    modifiers = resolveModifiers(event);
    const isShortcutFound = runShortcut(event.key, modifiers);
    event.stopPropagation();
    if (isShortcutFound) event.preventDefault();
  };

  function runShortcut(key: string, modifiers: string[]) {
    const keyMap = keyboardShortcuts.fecthKeyMap();
    const shortcut = keyMap.find((s: any) => {
      if (s.key.toLowerCase() !== key.toLowerCase()) return false;
      if (s.modifiers && s.modifiers.length !== modifiers.length) return false;
      return (
        (s.modifiers && s.modifiers.every((m: any) => modifiers.includes(m))) ||
        (!s.modifiers && modifiers.length === 0)
      );
    });
    logger.log({ key, modifiers, shortcut, keyMap });
    if (!shortcut) return;
    appStore.runAction(shortcut.action);
    return true;
  }
</script>

<svelte:window on:keydown={shortcutListener} />
