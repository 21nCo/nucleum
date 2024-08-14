<script lang="ts">
  import { Position } from "$lib/client/types/direction.enum";
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
  export let items: ISelectItem[];
  export let selected: ISelectValue;
  export let isHideBar: boolean = false;
  export let itemProps: {
    size?: Size.sm | Size.md | Size.lg;
    activeStatusPlacement?: Position;
    isHideLabel?: boolean;
  } = {
    size: Size.md,
    activeStatusPlacement: Position.Right
  };
</script>

<aside
  class={cn("flex flex-col h-full justify-center", {
    "items-start": itemProps.activeStatusPlacement === Position.Left,
    "items-end": itemProps.activeStatusPlacement === Position.Right,
    "gap-3": style === VerticalSwitcherStyle.DOT
  })}
>
  {#each items as item}
    <VerticalSwitcherItem
      {item}
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
