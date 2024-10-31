<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { Orientation } from "$lib/client/types/direction.enum";
  import type {
    IResourceSwitchItem,
    ISelectValue
  } from "$lib/client/types/select.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import ResourceSwitcherItem from "./ResourceSwitcherItem.svelte";
  const dispatch = createEventDispatcher();
  export let options: IResourceSwitchItem[];
  export let selected: ISelectValue | undefined = undefined;
  export let parentBgIndex: number = 1;
  export let size: Size.lg | Size.md | Size.sm = Size.md;
  export let iconOrientation: Orientation = Orientation.Horizontal;
  export let isShowCount: boolean = false;
  let classList: string = "flex w-full";
  if (selected === undefined) selected = options[0]?.value;
</script>

<div
  class={cn(classList, "mo:mb-1", {
    "gap-5": size === Size.lg,
    "mo:gap-3 gap-4": size === Size.md || size === Size.sm
  })}
>
  {#each options as item, index}
    <ResourceSwitcherItem
      {item}
      {size}
      {iconOrientation}
      {isShowCount}
      {parentBgIndex}
      isActive={selected === item.value}
      on:click={() => {
        if (item.isDisabled) return;
        selected = item.value;
        dispatch("select", item.value);
      }}
    />
  {/each}
</div>
