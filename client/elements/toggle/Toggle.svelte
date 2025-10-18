<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import HoverableElement from "../HoverableElement.svelte";
  import Icon from "../Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import type { IToolTipOptions } from "../text/text.type";
  import Badge from "../text/Badge.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { tooltip as tooltipAction } from "$lib/client/actions/popover.action";
  import { Placement } from "$lib/client/types/direction.enum";
  import type { IKeyboardShortcut } from "$lib/client/components/shortcuts/shortcut.type";
  import ShortcutText from "../text/ShortcutText.svelte";
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
  class={cn("flex relative items-center justify-center rounded-md", {
    "min-h-8 min-w-8": bgSize === Size.sm || (!bgSize && size === Size.sm),
    "min-h-10 min-w-10": bgSize === Size.md || (!bgSize && size === Size.md),
    "min-h-12 min-w-12": bgSize === Size.lg || (!bgSize && size === Size.lg),
    [bg(parentBgIndex)]: isHovering || on
  })}
>
  <Icon
    {icon}
    {size}
    isFilled={on && !isPreventFillOnActive}
    class={cn({
      "fill-aps1": on,
      "stroke-fgs2": !on
    })}
    on:click
  />
  {#if count}
    <div class="absolute bottom-1 right-1">
      <Badge text={count} size={Size.sm} />
    </div>
  {/if}
  {#if shortcut}
    <ShortcutText {shortcut} size={shortcutSize} {parentBgIndex} />
  {/if}
</button>
