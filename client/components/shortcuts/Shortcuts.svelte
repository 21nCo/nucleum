<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { isTextElement } from "$lib/client/utils/browser.utils";
  import { keyboardShortcuts } from "./shortcuts.store";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  function handleSystemShortcuts(event: KeyboardEvent) {
    if (event.key === "Escape" || event.key === "Enter") {
      // event.preventDefault();
      appEvents.publish(event.key as GlobalEvent);
      return true;
    }
  }
  const shortcutListener = (event: KeyboardEvent) => {
    // console.log("shortcutListener", { event });
    const target = event.target || event.srcElement;
    const isShortcutRunCompleted = handleSystemShortcuts(event);
    if (isTextElement(target)) return;
    if (isShortcutRunCompleted) return;
    let modifiers = [];
    if (event.metaKey || event.ctrlKey) {
      modifiers.push("ctrl");
    }
    if (event.altKey) {
      modifiers.push("alt");
    }
    if (event.shiftKey) {
      modifiers.push("shift");
    }
    const isShortcutFound = runShortcut(event.key, modifiers);
    // if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
    //   event.preventDefault();
    //   runAction(Action.CMD);
    // } else if (event.key === "e" && (event.metaKey || event.ctrlKey)) {
    //   event.preventDefault();
    //   runAction(Action.EDIT_MODE);
    // } else if (event.key === "Escape") {
    //   modalEvent.hide();
    // }
    event.stopPropagation();
    if (isShortcutFound) event.preventDefault();
  };

  function runShortcut(key: string, modifiers: string[]) {
    const keyMap = keyboardShortcuts.fecthKeyMap();
    const shortcut = keyMap.find((s: any) => {
      if (s.key.toLowerCase() !== key.toLowerCase()) return false;
      if (s.modifiers && s.modifiers.length !== modifiers.length) return false;
      return (
        (s.modifiers &&
          s.modifiers.every((m: any) => modifiers.includes(m.toLowerCase()))) ||
        (!s.modifiers && modifiers.length === 0)
      );
    });
    console.log({ key, modifiers, shortcut, keyMap });
    if (!shortcut) return;
    appStore.runAction(shortcut.action);
    return true;
  }
</script>

<svelte:window on:keydown={shortcutListener} />
