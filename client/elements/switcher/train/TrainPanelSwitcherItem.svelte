<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import {
    PanelSwitcherActiveItemStrength,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import { createEventDispatcher } from "svelte";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import PanelSwitcherItemLabel from "../PanelSwitcherItemLabel.svelte";
  const dispatch = createEventDispatcher();
  export let item: ISelectItem;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let isActive: boolean = false;
  export let isDisabled: boolean = false;
  export let parentBgIndex: number = 1;
  export let index: number = 0;
  export let activeItemStrength: PanelSwitcherActiveItemStrength =
    PanelSwitcherActiveItemStrength.DEFAULT;

  const dev_isApplyBorderForDefaultActive = false;

  function onClick() {
    dispatch("click", item.value);
  }
</script>

<button
  class={cn(
    "relative min-w-fit w-fit group",
    {
      "rounded-full px-6 py-2": size === Size.lg,
      "rounded-[5px] px-3 py-1 w-24": size === Size.md,
      "rounded-[5px] px-3 py-1 w-16": size === Size.sm,
      "bg-ccs3 text-ccs1":
        isActive &&
        activeItemStrength === PanelSwitcherActiveItemStrength.DEFAULT,
      "bg-bgs1 text-fgs1":
        isActive &&
        activeItemStrength === PanelSwitcherActiveItemStrength.SUBTLE,
      "bg-ccs1 text-abg":
        isActive &&
        activeItemStrength === PanelSwitcherActiveItemStrength.STRONG,
      [`hover:${bg(parentBgIndex + 1)}`]:
        !isActive &&
        activeItemStrength !== PanelSwitcherActiveItemStrength.SUBTLE
    },
    dev_isApplyBorderForDefaultActive &&
      activeItemStrength === PanelSwitcherActiveItemStrength.DEFAULT && {
        border: true,
        "border-transparent": !isActive,
        "border-ccs2": isActive
      }
  )}
  on:click={onClick}
  disabled={isDisabled}
>
  <div
    class={cn("flex gap-1 justify-center items-center", {
      "text-base font-medium": size === Size.md && $view.isPortrait,
      "text-b3": size === Size.sm || size === Size.xs
    })}
  >
    <PanelSwitcherItemLabel
      {item}
      size={size === Size.lg ? Size.md : Size.sm}
      style={PanelSwitcherStyle.TRAIN}
      {isActive}
      {isDisabled}
      {index}
      {parentBgIndex}
      {activeItemStrength}
      on:remove
      on:change
      on:debouncedChange
    />
  </div>
</button>
