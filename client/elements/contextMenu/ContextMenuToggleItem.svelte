<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import Icon from "../Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import Badge from "../text/Badge.svelte";
  import type { IContextMenuItem } from "$lib/client/types/select.type";
  import { hoverable } from "$lib/client/actions/hover.action";
  const dispatch = createEventDispatcher();
  export let item: IContextMenuItem;
  export let on: boolean = item.initialValue ?? false;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let parentBgIndex: number = 1;
  export let isPreventFillOnActive: boolean = false;
  export let count: number | undefined = undefined;
  let isHovering: boolean = false;
  function onclick() {
    on = !on;
    dispatch("change", on);
  }
</script>

<button
  on:click={onclick}
  use:hoverable={{
    onHover: (e) => {
      isHovering = e;
    }
  }}
  class={cn("flex flex-col items-center justify-center rounded-md border", {
    "min-h-8 min-w-8": size === Size.sm,
    "min-h-10 min-w-10": size === Size.md,
    "min-h-16 min-w-16": size === Size.lg,
    [bg(parentBgIndex + 1)]: isHovering,
    "bg-aps3 border-aps1 text-aps1": on,
    "border-brs3": !on && !isHovering
  })}
>
  <Icon
    icon={on ? item.activeIcon : item.icon}
    size={size === Size.lg ? Size.md : size}
    isFilled={on && !isPreventFillOnActive}
    class={cn({
      "fill-aps1": on,
      "stroke-fgs1": !on
    })}
    on:click
  />
  <span class="text-b3">{on ? item.activeLabel : item.label}</span>
  {#if count}
    <div class="absolute bottom-1 right-1">
      <Badge text={count} size={Size.sm} />
    </div>
  {/if}
</button>
