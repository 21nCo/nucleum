<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import HoverableElement from "../HoverableElement.svelte";
  import Icon from "../Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import type { IToolTipOptions } from "../text/text.type";
  import Badge from "../text/Badge.svelte";
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
  let isHovering: boolean = false;
  function onclick() {
    on = !on;
    dispatch("change", on);
  }
</script>

<HoverableElement
  on:click={onclick}
  bind:isHovering
  {tooltip}
  {tooltipOptions}
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
      "stroke-fgs1": !on
    })}
    on:click
  />
  {#if count}
    <div class="absolute bottom-1 right-1">
      <Badge text={count} size={Size.sm} />
    </div>
  {/if}
</HoverableElement>
