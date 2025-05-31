<script lang="ts">
  import { resolveShortcutText } from "$lib/client/components/shortcuts/shortcut.utils";
  import { keyboardShortcuts } from "$lib/client/components/shortcuts/shortcuts.store";
  import context from "$lib/client/stores/context.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import Icon from "../Icon.svelte";
  import type { IKeyboardShortcut } from "$lib/client/components/shortcuts/shortcut.type";
  import { KeyboardKey } from "$lib/client/types/keyboard.type";
  export let shortcut: string | IKeyboardShortcut;
  export let parentBgIndex: number | undefined = undefined;
  export let isPlainText: boolean = false;
  export let isAccentOutlined: boolean = false;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  let detail: IKeyboardShortcut | undefined = undefined;

  $: text = resolveText(shortcut);
  function resolveText(shortcut: string | IKeyboardShortcut | undefined) {
    if (!shortcut) return;
    if (typeof shortcut === "string") {
      if (shortcut === GlobalEvent.ESCAPE) return "Esc";
      detail = keyboardShortcuts.resolveShortcutForAction(shortcut);
    } else {
      detail = shortcut as IKeyboardShortcut;
    }
    if (!detail) return;
    let text = resolveShortcutText({
      key: detail.key,
      modifiers: detail.modifiers,
      os: $context.os
    });
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
    "flex justify-center items-center whitespace-nowrap rounded-md",
    {
      border: !isPlainText,
      "border-ccs2": isAccentOutlined,
      "px-1.5 py-[1px] text-b4": size === Size.md || size === Size.lg,
      "px-1 py-[0.5px] text-b5": size === Size.xs || size === Size.sm
    },
    !isPlainText &&
      !isAccentOutlined && {
        [bg(parentBgIndex)]: parentBgIndex !== undefined,
        "text-fgs3 border-brs3": parentBgIndex !== undefined,
        "border-abg": parentBgIndex === undefined
      }
  )}
>
  {text?.replace("ENTER", "") ?? ""}
  {#if detail?.key === KeyboardKey.ENTER}
    &nbsp;
    <Icon
      icon="arrow-turn-down-left"
      size={Size.xs}
      class={cn({
        "stroke-fgs3": parentBgIndex !== undefined,
        "fill-abg stroke-abg": parentBgIndex === undefined && !isAccentOutlined,
        "fill-aps1 stroke-aps1": parentBgIndex === undefined && isAccentOutlined
      })}
    />
  {/if}
</span>
