<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import type { IPropertyConfigOption } from "../property.type";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  export let item: IPropertyConfigOption;
  export let isSelectedContext: boolean = false;
  export let isSelected: boolean = false;
  export let isPreventTagStyle: boolean = false;
</script>

<button
  class={cn("text-left text-b2 flex justify-between", {
    "bg-bgs3": isSelected && !isSelectedContext,
    "py-1.5 hover:bg-bgs3 px-3 w-full": !isSelectedContext
  })}
  on:click
>
  {#if isPreventTagStyle}
    {item ? (isValidString(item?.label) ? item?.label : "Untitled") : "None"}
  {:else}
    <CustomColorPropagator
      color={item?.color}
      class={cn("px-4 py-0.5 rounded-md w-fit bg-ccs3 whitespace-nowrap")}
    >
      {item ? (isValidString(item?.label) ? item?.label : "Untitled") : "None"}
    </CustomColorPropagator>
  {/if}
  {#if isSelected}
    <Icon icon="check" class="text-fgs3" />
  {/if}
</button>
