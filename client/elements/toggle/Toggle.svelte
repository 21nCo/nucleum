<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import HoverableElement from "../HoverableElement.svelte";
  import Icon from "../Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import type { IToolTipOptions } from "../text/text.type";
  const dispatch = createEventDispatcher();
  export let icon: string;
  export let on: boolean = false;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let parentBgIndex: number = 1;
  export let tooltip: string | undefined = undefined;
  export let tooltipOptions: IToolTipOptions | undefined = undefined;
  let isHovering: boolean = false;
  function onclick() {
    on = !on;
    dispatch("change", on);
  }
  $: renderedIcon =
    on && icon.includes(":") ? icon.replace("-thin", "-fill") : icon;
</script>

<HoverableElement
  on:click={onclick}
  bind:isHovering
  {tooltip}
  {tooltipOptions}
  class={cn("flex items-center justify-center rounded-md", {
    "min-h-8 min-w-8": size === Size.sm,
    "min-h-10 min-w-10": size === Size.md,
    "min-h-12 min-w-12": size === Size.lg,
    [bg(parentBgIndex)]: isHovering || on
  })}
>
  <Icon
    icon={renderedIcon}
    {size}
    class={cn({
      "fill-aps1": on,
      "stroke-fgs1": !on
    })}
  />
</HoverableElement>
