<script lang="ts">
  import { Direction } from "$lib/tidy/types/direction.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import {
    VerticalSwitcherStyle,
    type SwitchItem
  } from "$lib/tidy/types/switcher.enum";
  import VerticalSwitcherItem from "./VerticalSwitcherItem.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let style: VerticalSwitcherStyle = VerticalSwitcherStyle.BAR;
  export let items: SwitchItem[];
  export let selected: string;
  export let itemProps: {
    size?: Size;
    activeStatusPlacement?: Direction;
  } = {
    size: Size.md,
    activeStatusPlacement: Direction.Right
  };
</script>

<aside class="flex flex-col h-full items-center justify-center">
  {#each items as item}
    <VerticalSwitcherItem
      {item}
      {...itemProps}
      {style}
      isActive={selected === item.label}
      on:click={() => {
        selected = item.label;
        dispatch("switch", selected);
      }}
    />
  {/each}
</aside>
