<script lang="ts">
  import { Orientation, Placement } from "@21n/types/direction.enum";
  import type { ISelectItem, ISelectValue } from "@21n/types/select.type";
  import { Size } from "@21n/types/size.enum";
  import { VerticalSwitcherStyle } from "@21n/types/switcher.enum";
  import { cn } from "@21n/utils/ui.utils";
  import VerticalSwitcherItem from "@21n/elements/switcher/VerticalSwitcherItem.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let style: VerticalSwitcherStyle = VerticalSwitcherStyle.BAR;
  export let labelOrientation: Orientation = Orientation.Vertical;
  export let items: ISelectItem[];
  export let selected: ISelectValue;
  export let isHideBar: boolean = false;
  export let parentBgIndex: number = 1;
  export let itemProps: {
    size?: Size.sm | Size.md | Size.lg;
    activeStatusPlacement?: Placement;
    isHideLabel?: boolean;
  } = {
    size: Size.md,
    activeStatusPlacement: Placement.Right
  };
</script>

<aside
  class={cn("flex flex-col h-full w-full", {
    "items-start": itemProps.activeStatusPlacement === Placement.Left,
    "items-end": itemProps.activeStatusPlacement === Placement.Right,
    "gap-3":
      style === VerticalSwitcherStyle.DOT ||
      (labelOrientation === Orientation.Vertical &&
        style === VerticalSwitcherStyle.GRADIENT),
    "justify-center": labelOrientation === Orientation.Vertical
  })}
>
  {#each items as item (item.value)}
    <VerticalSwitcherItem
      {item}
      {parentBgIndex}
      {labelOrientation}
      {...itemProps}
      {style}
      {isHideBar}
      isActive={selected === item.value}
      on:click={() => {
        selected = item.value;
        dispatch("switch", selected);
      }}
    />
  {/each}
</aside>
