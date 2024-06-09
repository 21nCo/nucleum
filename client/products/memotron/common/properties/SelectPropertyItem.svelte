<script lang="ts">
  import type { PropertyConfigOption } from "$lib/client/types/memotron/type.type";
  import ActiveBackgroundElement from "$lib/client/elements/style/ActiveBackgroundElement.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  export let item: PropertyConfigOption;
  export let isSelectedContext: boolean = false;
</script>

<button
  class={cn("w-full text-left px-3", {
    "py-2 hover:bg-bgs2": !isSelectedContext
  })}
  on:click
>
  <ActiveBackgroundElement
    color={item.color}
    isBackgroundActive={true}
    class={cn("px-4 rounded-md min-w-fit", {})}
  >
    {item.label}
  </ActiveBackgroundElement>
</button>
