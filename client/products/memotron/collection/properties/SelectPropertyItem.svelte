<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import type { PropertyConfigOption } from "./property.type";
  import { isValidString } from "$lib/shared/utils/text.utils";
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
    color={item?.color}
    class={cn("px-4 py-0.5 rounded-md w-fit bg-ccs3")}
  >
    {item ? (isValidString(item?.label) ? item?.label : "Untitled") : "None"}
  </CustomColorPropagator>
</button>
