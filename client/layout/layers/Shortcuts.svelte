<script lang="ts">
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { AppEvent } from "$lib/client/types/event.enum";
  import type { KeyboardShortcut } from "$lib/client/types/preferences.type";
  import { isTextElement } from "$lib/client/utils/browser.utils";
  import { onMount } from "svelte";
  let defaultKeyMap = $appStore?.appData?.shortcuts;
  let userKeyMap = $userPreferences?.shortcuts;
  onMount(() => {
    const userPreferencesSub = userPreferences.subscribe((x) => {
      userKeyMap = x?.shortcuts;
    });
    const appStoreSub = appStore.subscribe((x) => {
      defaultKeyMap = x?.appData?.shortcuts;
    });
    return () => {
      userPreferencesSub();
      appStoreSub();
    };
  });
  function handleShortcutsForTextBoxScenario(event: KeyboardEvent) {
    const target = event.target || event.srcElement;
    if (event.key === "Escape") {
      event.preventDefault();
      modalEvent.hide();
      return true;
    }
    if (isTextElement(target)) return;
    if (event.key === "q") {
      event.preventDefault();
      appStore.runAction(AppEvent.TOGGLE_SIDEBAR);
      return true;
    }
  }
  const shortcutListener = (event: KeyboardEvent) => {
    defaultKeyMap = $appStore?.appData?.shortcuts;
    const isShortcutRunCompleted = handleShortcutsForTextBoxScenario(event);
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
    //   runAction(AppEvent.CMD);
    // } else if (event.key === "e" && (event.metaKey || event.ctrlKey)) {
    //   event.preventDefault();
    //   runAction(AppEvent.EDIT_MODE);
    // } else if (event.key === "Escape") {
    //   modalEvent.hide();
    // }
    event.stopPropagation();
    if (isShortcutFound) event.preventDefault();
  };

  function runShortcut(key: string, modifiers: string[]) {
    if (!defaultKeyMap) return;
    let keyMap = defaultKeyMap;
    if (userKeyMap) {
      keyMap = defaultKeyMap.filter(
        (x: KeyboardShortcut) =>
          !userKeyMap?.some((y: KeyboardShortcut) => y.action === x.action)
      );
      keyMap = [...keyMap, ...userKeyMap];
    }
    // console.log({ keyMap, key, modifiers });
    const shortcut = keyMap.find((s: any) => {
      if (s.key !== key) return false;
      if (s.modifiers.length !== modifiers.length) return false;
      return s.modifiers.every((m: any) => modifiers.includes(m.toLowerCase()));
    });
    if (!shortcut) return;
    appStore.runAction(shortcut.action);
    return true;
  }
</script>

<svelte:window on:keydown={shortcutListener} />
