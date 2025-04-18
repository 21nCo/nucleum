<script lang="ts">
  import { isTextElement } from "$lib/client/utils/browser.utils";
  import type { IKeyboardShortcut } from "./shortcut.type";
  import { keyboardShortcuts } from "./shortcuts.store";
  export let shortcuts: {
    shortcut: string | IKeyboardShortcut;
    callback: () => void;
  }[];

  function shortcutListener(event: KeyboardEvent) {
    const isTextInputSource = isTextElement(event.target);
    if (isTextInputSource) return;
    const result = shortcuts.find((s) =>
      keyboardShortcuts.checkShortcut(event, s.shortcut)
    );
    if (result) {
      result.callback();
      event.preventDefault();
      event.stopPropagation();
    }
  }
</script>

<svelte:document on:keydown={shortcutListener} />
