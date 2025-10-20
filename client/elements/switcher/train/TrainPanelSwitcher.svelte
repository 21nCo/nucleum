<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Size } from "@21n/types/size.enum";
  import { bg, cn } from "@21n/utils/ui.utils";
  import type {
    ISelectItem,
    ISelectValue
  } from "@21n/types/select.type";
  import TrainPanelSwitcherItem from "@21n/elements/switcher/train/TrainPanelSwitcherItem.svelte";
  import { PanelSwitcherActiveItemStrength } from "@21n/types/switcher.enum";
  const dispatch = createEventDispatcher();
  export let items: ISelectItem[];
  export let value: ISelectValue | undefined = undefined;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let isDisableEnabled: boolean = false;
  export let parentBgIndex: number = 1;
  export let activeItemStrength: PanelSwitcherActiveItemStrength =
    PanelSwitcherActiveItemStrength.DEFAULT;
  const effectiveParentBgIndex =
    activeItemStrength === PanelSwitcherActiveItemStrength.STRONG
      ? parentBgIndex
      : activeItemStrength === PanelSwitcherActiveItemStrength.SUBTLE
        ? parentBgIndex + 1
        : parentBgIndex - 1;
</script>

<div
  class={cn(
    "relative panel-switcher flex items-center shrink-0 overflow-x-auto"
  )}
>
  <div
    class={cn("flex items-center min-w-fit", bg(effectiveParentBgIndex), {
      "border border-brs3 p-0.5":
        activeItemStrength !== PanelSwitcherActiveItemStrength.SUBTLE,
      "p-1": activeItemStrength === PanelSwitcherActiveItemStrength.SUBTLE,
      "rounded-full": size === Size.lg,
      "rounded-md": size !== Size.lg
    })}
  >
    {#each items as item, index (item.value)}
      <TrainPanelSwitcherItem
        {item}
        {size}
        parentBgIndex={effectiveParentBgIndex}
        {index}
        {activeItemStrength}
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
