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
  import { Embed } from "$lib/client/types/context.type";
  import { uiStateDerived } from "$lib/client/stores/uiState/uiState.store";

  export let shortcut: string | IKeyboardShortcut | undefined;
  export let parentBgIndex: number | undefined = undefined;
  export let isPlainText: boolean = false;
  export let isAccentOutlined: boolean = false;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let isAlwaysShown: boolean = false;
  let detail: IKeyboardShortcut | undefined = undefined;
  const iconKeys = new Map<KeyboardKey, string>([
    [KeyboardKey.ENTER, "arrow-turn-down-left"],
    [KeyboardKey.ARROW_LEFT, "arrow-left"],
    [KeyboardKey.ARROW_RIGHT, "arrow-right"],
    [KeyboardKey.ARROW_UP, "arrow-up"],
    [KeyboardKey.ARROW_DOWN, "arrow-down"]
  ]);
  const textReplacements = [{ key: KeyboardKey.ESCAPE, text: "Esc" }];

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

{#if ($uiStateDerived?.isShowHotKeyHints || isAlwaysShown) && shortcut && $context.embed !== Embed.HANDSET}
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
    {#if detail?.key && iconKeys.has(detail?.key)}
      {text?.replace(detail?.key?.toUpperCase(), "") ?? ""}
      <Icon
        icon={iconKeys.get(detail?.key)}
        size={Size.xs}
        class={cn({
          "stroke-fgs3": parentBgIndex !== undefined,
          "fill-abg stroke-abg":
            parentBgIndex === undefined && !isAccentOutlined,
          "fill-aps1 stroke-aps1":
            parentBgIndex === undefined && isAccentOutlined
        })}
      />
    {:else if text && textReplacements.some( (x) => text?.includes(x.key.toUpperCase()) )}
      {@const replacement = textReplacements.find((x) =>
        text?.includes(x.key.toUpperCase())
      )}
      {text.replace(
        replacement?.key?.toUpperCase() ?? "",
        replacement?.text ?? ""
      ) ?? ""}
    {:else}
      {text ?? ""}
    {/if}
  </span>
{/if}
