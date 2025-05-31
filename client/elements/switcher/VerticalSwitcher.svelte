<script lang="ts">
  import { Orientation, Placement } from "$lib/client/types/direction.enum";
  import type {
    ISelectItem,
    ISelectValue
  } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { VerticalSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import VerticalSwitcherItem from "./VerticalSwitcherItem.svelte";
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
