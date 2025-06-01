<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
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

  function onClick() {
    dispatch("click", item.value);
  }
</script>

<button
  class={cn("relative min-w-fit", {
    "rounded-full px-6 py-2": size === Size.lg,
    "rounded-[5px] px-3 py-1 w-24": size === Size.md,
    "rounded-[5px] px-3 py-1 w-16": size === Size.sm,
    "bg-ccs1 text-abg": isActive,
    [`hover:${bg(parentBgIndex + 1)}`]: !isActive
  })}
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
      {size}
      style={PanelSwitcherStyle.TRAIN}
      {isActive}
      {isDisabled}
      {index}
      {parentBgIndex}
      on:remove
      on:change
      on:debouncedChange
    />
  </div>
</button>
