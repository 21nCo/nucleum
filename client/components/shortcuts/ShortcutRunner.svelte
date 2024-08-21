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
  /**
   * Listens to keyboard events and runs the shortcut if the event is a shortcut.
   *
   * Avoids running the shortcut if the event is a text input element and the key is `Enter`. This is to avoid running the shortcut when the user is typing in a text field with suggestions.
   * @param event
   */
  const shortcutListener = (event: KeyboardEvent) => {
    logger.log({ event, at: "shortcutListener" });
    const target = event.target || event.srcElement;
    const isTextInputSource = isTextElement(target);
    let modifiers = [];
    modifiers = resolveModifiers(event);
    const shortcut = resolveShortcut(event.key, modifiers);
    if (
      isTextInputSource &&
      (event.key === KeyboardKey.ENTER ||
        (modifiers.length === 0 &&
          ![KeyboardKey.ESCAPE].includes(event.key as KeyboardKey)))
    )
      return;
    const isSystemShortcut = handleSystemShortcuts(event);
    if (isSystemShortcut || !shortcut) return;
    appStore.runAction(shortcut.action);
    event.stopPropagation();
    event.preventDefault();
  };

  /**
   * Resolves the shortcut for the given key and modifiers.
   * @param key
   * @param modifiers
   */
  function resolveShortcut(key: string, modifiers: string[]) {
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
    return shortcut;
  }
</script>

<svelte:window on:keydown={shortcutListener} />
