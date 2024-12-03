<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import type { PropertyConfigOption } from "../property.type";
  import { isValidString } from "$lib/shared/utils/text.utils";
  export let item: PropertyConfigOption;
  export let isSelectedContext: boolean = false;
  export let isPlain: boolean = false;
</script>

<button
  class={cn("w-full text-left text-b2", {
    "py-2 hover:bg-bgs3": !isSelectedContext,
    "px-3": !isPlain
  })}
  on:click
>
  <CustomColorPropagator
    color={item?.color}
    class={cn("px-4 py-0.5 rounded-md w-fit bg-ccs3 whitespace-nowrap")}
  >
    {item ? (isValidString(item?.label) ? item?.label : "Untitled") : "None"}
  </CustomColorPropagator>
</button>
