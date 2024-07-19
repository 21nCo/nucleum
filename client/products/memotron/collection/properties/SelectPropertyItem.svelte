<script lang="ts">
  import type { PropertyConfigOption } from "$lib/client/types/memotron/type.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  export let item: PropertyConfigOption;
  export let isSelectedContext: boolean = false;
</script>

<button
  class={cn("w-full text-left px-3", {
    "py-2 hover:bg-bgs2": !isSelectedContext
  })}
  on:click
>
  <CustomColorPropagator
    color={item.color}
    class={cn("px-4 rounded-md min-w-fit bg-ccs1")}
  >
    {item.label}
  </CustomColorPropagator>
</button>
