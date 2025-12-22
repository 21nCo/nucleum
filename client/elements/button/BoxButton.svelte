<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import { bg, cn } from "@21n/utils/ui.utils";
  import Icon from "../Icon.svelte";
  import { popover } from "@21n/actions/popover.action";
  import { ButtonVariant } from "@21n/types/button.type";
  import type { IKeyboardShortcut } from "@21n/components/shortcuts/shortcut.type";
  import ButtonTooltip from "@21n/elements/button/ButtonTooltip.svelte";
  import ShortcutText from "../text/ShortcutText.svelte";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
  export let icon: string | undefined = undefined;
  export let tooltip: string | undefined = undefined;
  export let label: string | undefined = undefined;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let parentBgIndex: number = 1;
  export let width: string = "";
  export let type: ButtonVariant = ButtonVariant.SECONDARY;
  export let shortcut: string | IKeyboardShortcut | undefined = undefined;
  const id = generateSimpleRandomId();
</script>

<button
  class={cn(
    "flex gap-1 justify-center h-full w-full items-center",
    width,
    `hover:${bg(parentBgIndex)}-striped`,
    {
      "text-b2": size === Size.md,
      "text-b3": size === Size.sm,
      "text-ars1": type === ButtonVariant.DANGER
    }
  )}
  on:click|stopPropagation
  use:popover={{
    content: tooltip ? ButtonTooltip : "",
    triggerMethod: tooltip ? [PopoverTriggerMethod.HOVER] : [],
    // placement: tooltipOptions.placement,
    isSecondary: true,
    id: `button-tooltip-popover-${id}`,
    componentProps: tooltip
      ? {
          tooltip,
          shortcut,
          parentBgIndex,
          size: Size.sm
        }
      : {}
  }}
>
  {#if icon}
    <Icon
      {icon}
      size={size ?? Size.md}
      class={cn({
        "text-ars1": type === ButtonVariant.DANGER
      })}
    />
  {/if}
  {#if label}
    {label}
  {/if}
  {#if label && shortcut}
    <ShortcutText {shortcut} size={Size.sm} parentBgIndex={parentBgIndex + 1} />
  {/if}
</button>
