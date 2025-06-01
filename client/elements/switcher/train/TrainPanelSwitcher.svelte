<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import type {
    ISelectItem,
    ISelectValue
  } from "$lib/client/types/select.type";
  import TrainPanelSwitcherItem from "./TrainPanelSwitcherItem.svelte";
  const dispatch = createEventDispatcher();
  export let items: ISelectItem[];
  export let value: ISelectValue | undefined = undefined;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let isDisableEnabled: boolean = false;
  export let parentBgIndex: number = 1;
</script>

<div
  class={cn(
    "relative panel-switcher flex items-center shrink-0 overflow-x-auto"
  )}
>
  <div
    class={cn(
      "flex items-center min-w-fit border-brs3 p-0.5",
      bg(parentBgIndex),
      {
        "rounded-full border": size === Size.lg,
        "rounded-md border": size !== Size.lg
      }
    )}
  >
    {#each items as item, index (item.value)}
      <TrainPanelSwitcherItem
        {item}
        {size}
        {parentBgIndex}
        {index}
        isActive={value === item.value}
        isDisabled={isDisableEnabled && value !== item.value}
        on:click={() => {
          value = item.value;
          dispatch("switch", item.value);
        }}
      />
    {/each}
  </div>
</div>
