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
  export let size: Size.sm | Size.md = Size.md;
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
  $: trimmedText = text?.trim();
  $: isSingleLetterShortcut =
    !!trimmedText &&
    Array.from(trimmedText).length === 1 &&
    (!detail?.modifiers || detail?.modifiers.length === 0);

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

{#if ($uiStateDerived?.isShowHotKeyHints || isAlwaysShown) && shortcut && $context.embed !== Embed.HANDSET && $context.embed !== Embed.TABLET}
  <span
    class={cn(
      "flex justify-center items-center whitespace-nowrap font--mono rounded-md",
      {
        "text-b4  min-h-[1.125rem] h-[1.125rem]": size === Size.md,
        "text-b5": size === Size.sm,
        "border-ccs2": isAccentOutlined
      },
      isSingleLetterShortcut && {
        "px-0 py-0": true,
        "min-w-[1.125rem] w-[1.125rem] ": size === Size.md,
        "min-w-3.5 w-3.5 min-h-3.5 h-3.5": size === Size.sm
      },
      !isSingleLetterShortcut && {
        "px-1 min-h-4 h-4": size === Size.sm,
        "px-1.5": size === Size.md
      },
      !isPlainText && {
        "border-[0.5px]":
          (isSingleLetterShortcut && size === Size.sm && !isAccentOutlined) ||
          !isSingleLetterShortcut,
        border: (size !== Size.sm || isAccentOutlined) && isSingleLetterShortcut
      },
      !isPlainText &&
        !isAccentOutlined && {
          [bg(parentBgIndex)]: parentBgIndex !== undefined,
          "text-fgs3 border-brs3": parentBgIndex !== undefined,
          "border-abg opacity-80": parentBgIndex === undefined
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
