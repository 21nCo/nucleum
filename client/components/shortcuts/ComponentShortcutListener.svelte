<script lang="ts">
  import { isTextElement } from "@21n/utils/browser.utils";
  import type { IKeyboardShortcut } from "@21n/components/shortcuts/shortcut.type";
  import { keyboardShortcuts } from "@21n/components/shortcuts/shortcuts.store";
  export let isAllowFromTextInput: boolean = false;
  export let shortcuts: {
    shortcut: string | IKeyboardShortcut;
    callback: () => void;
  }[];

  function shortcutListener(event: KeyboardEvent) {
    const isTextInputSource = isTextElement(event.target);
    if (isTextInputSource && !isAllowFromTextInput) return;
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
