<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import { bg, cn } from "@21n/utils/ui.utils";
  import HoverableElement from "@21n/elements/HoverableElement.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import type { IToolTipOptions } from "@21n/elements/text/text.type";
  import Badge from "@21n/elements/text/Badge.svelte";
  import { hoverable } from "@21n/actions/hover.action";
  import { tooltip as tooltipAction } from "@21n/actions/popover.action";
  import { Placement } from "@21n/types/direction.enum";
  import type { IKeyboardShortcut } from "@21n/components/shortcuts/shortcut.type";
  import ShortcutText from "@21n/elements/text/ShortcutText.svelte";
  const dispatch = createEventDispatcher();
  export let icon: string;
  export let on: boolean = false;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let parentBgIndex: number = 1;
  export let tooltip: string | undefined = undefined;
  export let tooltipOptions: IToolTipOptions | undefined = undefined;
  export let isPreventFillOnActive: boolean = false;
  export let count: number | undefined = undefined;
  export let bgSize: Size.sm | Size.md | Size.lg = Size.md;
  export let shortcut: string | IKeyboardShortcut | undefined = undefined;
  export let isBoxed: boolean = false;
  let isHovering: boolean = false;
  function onclick() {
    on = !on;
    dispatch("change", on);
  }
  $: shortcutSize = size === Size.lg ? Size.md : size;
</script>

<button
  on:click={onclick}
  on:mousedown
  use:hoverable={{
    onHover: (value) => {
      isHovering = value;
    }
  }}
  use:tooltipAction={{
    text: tooltip,
    direction: tooltipOptions?.placement ?? Placement.Bottom
  }}
  class={cn(
    "flex relative items-center justify-center",
    {
      "rounded-md": !isBoxed,
      "h-full w-full": isBoxed,
      [`${bg(parentBgIndex)}-striped`]: isHovering && !on,
      [bg(parentBgIndex)]: on
    },
    !isBoxed && {
      "min-h-8 min-w-8": bgSize === Size.sm || (!bgSize && size === Size.sm),
      "min-h-10 min-w-10": bgSize === Size.md || (!bgSize && size === Size.md),
      "min-h-12 min-w-12": bgSize === Size.lg || (!bgSize && size === Size.lg),
      [bg(parentBgIndex)]: isHovering || on
    }
  )}
>
  <Icon
    {icon}
    {size}
    isFilled={on && !isPreventFillOnActive}
    class={cn({
      "text-aps1": on,
      "text-fgs2": !on
    })}
    on:click
  />
  {#if count}
    <div
      class={cn("absolute", {
        "bottom-1 right-1": bgSize !== Size.sm,
        "bottom-0 right-0": bgSize === Size.sm
      })}
    >
      <Badge text={count} size={Size.sm} />
    </div>
  {/if}
  {#if shortcut}
    <ShortcutText {shortcut} size={shortcutSize} {parentBgIndex} />
  {/if}
</button>
