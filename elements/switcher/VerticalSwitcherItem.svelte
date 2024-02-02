<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { Direction } from "$lib/tidy/types/direction.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import {
    VerticalSwitcherStyle,
    type SwitchItem,
  } from "$lib/tidy/types/switcher.enum";
  import { properCase } from "$lib/tidy/utils/text.utils";
  export let item: SwitchItem;
  export let style: VerticalSwitcherStyle = VerticalSwitcherStyle.BAR;
  export let activeStatusPlacement: Direction = Direction.Left;
  export let size: Size = Size.md;
  export let isActive: boolean = false;
  $: console.log({ isActive, item });
  let activeClasses: string;
  let inactiveClasses: string;
  let sizeClasses: string;
  $: if (
    style === VerticalSwitcherStyle.GRADIENT &&
    activeStatusPlacement === Direction.Left
  ) {
    activeClasses =
      "border-l-2 border-l-bgs2 bg-gradient-to-l from-transparent to-bgs2";
    inactiveClasses = "border-l-2 border-l-bgs2 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR &&
    activeStatusPlacement === Direction.Left
  ) {
    activeClasses = "border-l-4 border-l-aps1 border-lounded-md";
    inactiveClasses = "border-l-4 border-l-bgs2 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.GRADIENT &&
    activeStatusPlacement === Direction.Right
  ) {
    activeClasses =
      "border-r-2 border-r-bgs2 bg-gradient-to-r from-transparent to-bgs2";
    inactiveClasses = "border-r-2 border-r-bgs2 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR &&
    activeStatusPlacement === Direction.Right
  ) {
    activeClasses = "border-r-4 border-r-aps1 border-rounded-md";
    inactiveClasses = "border-r-4 border-r-bgs2 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR_V2 &&
    activeStatusPlacement === Direction.Right
  ) {
    activeClasses = "border-r-4 border-r-aps1 border-rounded-md";
    inactiveClasses = "border-r-4 border-r-bgs1 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR_V2 &&
    activeStatusPlacement === Direction.Left
  ) {
    activeClasses = "border-l-4 border-l-aps1 border-lounded-md";
    inactiveClasses = "border-l-4 border-l-bgs1 text-fgs3";
  }
  $: if (size === Size.xs) {
    sizeClasses = "text-b4 w-16 gap-1 py-3";
  } else if (size === Size.sm) {
    sizeClasses = "text-b3 w-20 gap-1 py-4";
  } else if (size === Size.md) {
    sizeClasses = "text-b2 w-24 gap-2 py-4";
  } else if (size === Size.lg) {
    sizeClasses = "text-base w-24 gap-2 px-4 py-6";
  }
</script>

<div
  class={style === VerticalSwitcherStyle.BAR_V2
    ? activeStatusPlacement === Direction.Left
      ? "border-l-2 border-l-bgs3"
      : "border-r-2 border-r-bgs3"
    : ""}
>
  <button
    class="flex flex-col items-center {sizeClasses} {isActive
      ? activeClasses
      : inactiveClasses}"
    on:click
  >
    {#if item.icon}
      <Icon
        icon={item.icon.toLowerCase()}
        color={!isActive ? "fgs3" : undefined}
      />
    {/if}
    <slot />
    <span>{properCase(item.label)}</span>
  </button>
</div>
