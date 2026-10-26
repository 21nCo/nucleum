<svelte:options runes={true} />

<script lang="ts">
  import { isTextElement } from "@21n/ui/actions/interaction-dom";
  import type { IKeyboardShortcut } from "@21n/ui/elements/keyboard/shortcut.type";
  let {
    isAllowFromTextInput = false,
    checkShortcut,
    shortcuts
  }: {
    isAllowFromTextInput?: boolean;
    checkShortcut: (
      event: KeyboardEvent,
      shortcut: string | IKeyboardShortcut
    ) => boolean;
    shortcuts: {
      shortcut: string | IKeyboardShortcut;
      callback: () => void;
    }[];
  } = $props();

  function shortcutListener(event: KeyboardEvent) {
    const isTextInputSource = isTextElement(event.target);
    if (isTextInputSource && !isAllowFromTextInput) return;
    const result = shortcuts.find((s) => checkShortcut(event, s.shortcut));
    if (result) {
      result.callback();
      event.preventDefault();
      event.stopPropagation();
    }
  }
</script>

<svelte:document onkeydown={shortcutListener} />
