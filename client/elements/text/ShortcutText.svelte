<script lang="ts">
  import { resolveShortcutText } from "$lib/client/components/shortcuts/shortcut.utils";
  import { keyboardShortcuts } from "$lib/client/components/shortcuts/shortcuts.store";
  import context from "$lib/client/stores/context.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import Icon from "../Icon.svelte";
  export let shortcut: string;
  export let parentBgIndex: number | undefined = undefined;
  export let isPlainText: boolean = false;
  $: text = resolveText(shortcut);
  function resolveText(shortcut: string | undefined) {
    if (!shortcut) return;
    if (shortcut === GlobalEvent.ESCAPE) return "Esc";
    else if (shortcut === GlobalEvent.ENTER) return "↵";
    const keyMap = keyboardShortcuts.fecthKeyMap();
    const shortcutDetail = keyMap.find((x) => x.action === shortcut);
    if (!shortcutDetail) return;
    let text = resolveShortcutText(
      shortcutDetail.key,
      shortcutDetail.modifiers,
      $context.os
    );
    return text;
  }
  onMount(() => {
    const unsubscribe = keyboardShortcuts.subscribe((x) => {
      text = resolveText(shortcut);
    });

    return () => {
      unsubscribe();
    };
  });
</script>

<span
  class={cn(
    "flex justify-center items-center whitespace-nowrap rounded-md px-1.5 py-[1px]",
    {
      "text-b4": isPlainText,
      "border text-b5": !isPlainText
    },
    !isPlainText && {
      [bg(parentBgIndex)]: parentBgIndex !== undefined,
      "text-fgs3 border-brs3": parentBgIndex !== undefined,
      "border-abg": parentBgIndex === undefined
    }
  )}
>
  {#if shortcut === GlobalEvent.ENTER}
    <Icon
      icon="arrow-turn-down-left"
      size={Size.xs}
      class={cn({
        "stroke-fgs3": parentBgIndex !== undefined,
        "stroke-abg": parentBgIndex === undefined
      })}
    />
  {:else}
    {text}
  {/if}
</span>
