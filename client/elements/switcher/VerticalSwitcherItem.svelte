<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Direction } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import {
    VerticalSwitcherStyle,
    type SwitchItem
  } from "$lib/client/types/switcher.enum";
  import { renderPopoverv2 } from "$lib/client/utils/browser.utils";
  import { properCase } from "$lib/client/utils/text.utils";
  import { onMount } from "svelte";
  import Tooltip from "../text/Tooltip.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  export let item: SwitchItem;
  export let style: VerticalSwitcherStyle = VerticalSwitcherStyle.BAR;
  export let activeStatusPlacement: Direction = Direction.Left;
  export let isHideLabel: boolean = false;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let isActive: boolean = false;
  export let isHideBar: boolean = false;
  // $: console.log({ isActive, item });
  let activeClasses: string;
  let inactiveClasses: string;
  let sizeClasses: string;
  let toolTipRef: any;
  let parentRef: any;
  onMount(() => {
    hideToolTip();
  });
  $: if (
    style === VerticalSwitcherStyle.GRADIENT &&
    activeStatusPlacement === Direction.Left
  ) {
    activeClasses =
      "border-l-2 border-l-bgs2 bg-gradient-to-l from-transparent to-bgs2";
    inactiveClasses = "border-l-2 border-l-bgs2 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.GRADIENT &&
    activeStatusPlacement === Direction.Right
  ) {
    activeClasses =
      "border-r-2 border-r-bgs2 bg-gradient-to-r from-transparent to-bgs2";
    inactiveClasses = "border-r-2 border-r-bgs2 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR &&
    activeStatusPlacement === Direction.Left
  ) {
    activeClasses = "border-rounded-md";
    inactiveClasses = "border-l-bgs2 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR &&
    activeStatusPlacement === Direction.Right
  ) {
    activeClasses = "border-rounded-md";
    inactiveClasses = "border-r-bgs2 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR_V2 &&
    activeStatusPlacement === Direction.Right
  ) {
    activeClasses = "border-r-4 border-rounded-md";
    inactiveClasses = "border-r-4 border-r-bgs1 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR_V2 &&
    activeStatusPlacement === Direction.Left
  ) {
    activeClasses = "border-l-4 border-rounded-md";
    inactiveClasses = "border-l-4 border-l-bgs1 text-fgs3";
  }
  $: if (size === Size.xs) {
    sizeClasses = "text-b5 w-16 gap-1 py-3";
  } else if (size === Size.sm) {
    sizeClasses = "text-b4 gap-1 py-4";
    if (!isHideLabel) sizeClasses += " w-[4.5rem]";
    else sizeClasses += " px-2";
  } else if (size === Size.md) {
    sizeClasses = "text-b2 gap-2 py-4";
    if (isHideLabel) sizeClasses += " px-3";
    else sizeClasses += " w-24";
  } else if (size === Size.lg) {
    sizeClasses = "text-base w-24 gap-2 px-4 py-6";
  }
  function hideToolTip() {
    if (toolTipRef && toolTipRef?.style?.display != "none")
      toolTipRef.style.display = "none";
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
    class={cn("flex flex-col items-center", sizeClasses, {
      [activeClasses]: isActive,
      [inactiveClasses]: !isActive,
      "border-ccs1": isActive,
      "border-l-4":
        style === VerticalSwitcherStyle.BAR &&
        !isHideBar &&
        activeStatusPlacement === Direction.Left,
      "border-r-4":
        style === VerticalSwitcherStyle.BAR &&
        !isHideBar &&
        activeStatusPlacement === Direction.Right
    })}
    on:click
    bind:this={parentRef}
    on:pointerenter={() => {
      if (isHideLabel && item.label)
        renderPopoverv2(parentRef, toolTipRef, Direction.Left);
    }}
    on:pointerleave={() => {
      hideToolTip();
    }}
  >
    {#if item.icon}
      <Icon
        icon={item.icon.toLowerCase()}
        {size}
        class={cn({
          "fill-fgs1": isActive,
          "stroke-fgs3": !isActive
        })}
      />
    {/if}
    <slot />
    {#if !isHideLabel}
      <span class="w-min {isActive ? 'font-medium' : ''}"
        >{properCase(item.label)}</span
      >
    {/if}
    {#if isHideLabel && item.label}
      <div bind:this={toolTipRef}>
        <Tooltip tooltip={properCase(item.label)} />
      </div>
    {/if}
  </button>
</div>
