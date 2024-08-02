<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Position } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { VerticalSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import HoverableElement from "../HoverableElement.svelte";
  export let item: ISelectItem;
  export let style: VerticalSwitcherStyle = VerticalSwitcherStyle.BAR;
  export let activeStatusPlacement: Position = Position.Left;
  export let isHideLabel: boolean = false;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let isActive: boolean = false;
  export let isHideBar: boolean = false;
  // $: console.log({ isActive, item });
  let activeClasses: string;
  let inactiveClasses: string;
  let sizeClasses: string;
  $: if (
    style === VerticalSwitcherStyle.GRADIENT &&
    activeStatusPlacement === Position.Left
  ) {
    activeClasses =
      "border-l-2 border-l-bgs2 bg-gradient-to-l from-transparent to-bgs2";
    inactiveClasses = "border-l-2 border-l-bgs2 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.GRADIENT &&
    activeStatusPlacement === Position.Right
  ) {
    activeClasses =
      "border-r-2 border-r-bgs2 bg-gradient-to-r from-transparent to-bgs2";
    inactiveClasses = "border-r-2 border-r-bgs2 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR &&
    activeStatusPlacement === Position.Left
  ) {
    activeClasses = "border-rounded-md";
    inactiveClasses = "border-l-bgs2 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR &&
    activeStatusPlacement === Position.Right
  ) {
    activeClasses = "border-rounded-md";
    inactiveClasses = "border-r-bgs2 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR_V2 &&
    activeStatusPlacement === Position.Right
  ) {
    activeClasses = "border-r-4 border-rounded-md";
    inactiveClasses = "border-r-4 border-r-bgs1 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR_V2 &&
    activeStatusPlacement === Position.Left
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
</script>

<div
  class={cn({
    "border-l-2 border-l-bgs3":
      style === VerticalSwitcherStyle.BAR_V2 &&
      activeStatusPlacement === Position.Left,
    "border-r-2 border-r-bgs3":
      style === VerticalSwitcherStyle.BAR_V2 &&
      activeStatusPlacement === Position.Right
  })}
>
  <HoverableElement
    type="button"
    class={cn("relative flex flex-col items-center", sizeClasses, {
      [activeClasses]: isActive,
      [inactiveClasses]: !isActive,
      "border-ccs1": isActive,
      "border-l-4":
        style === VerticalSwitcherStyle.BAR &&
        !isHideBar &&
        activeStatusPlacement === Position.Left,
      "border-r-4":
        style === VerticalSwitcherStyle.BAR &&
        !isHideBar &&
        activeStatusPlacement === Position.Right
    })}
    tooltip={isHideLabel
      ? properCase(item.label ?? item.value?.toString())
      : undefined}
    tooltipOptions={{
      placement: Position.Left
    }}
    on:click
  >
    {#if item.icon && typeof item.icon === "string"}
      <Icon
        icon={item.icon.toLowerCase()}
        {size}
        class={cn({
          "fill-fgs1":
            isActive &&
            (style === VerticalSwitcherStyle.BAR ||
              style === VerticalSwitcherStyle.GRADIENT),
          "fill-aps1":
            isActive &&
            (style === VerticalSwitcherStyle.BG ||
              style === VerticalSwitcherStyle.DOT),
          "stroke-fgs3": !isActive
        })}
      />
    {/if}
    <slot />
    {#if !isHideLabel}
      <span class="w-min {isActive ? 'font-medium' : ''}"
        >{properCase(item?.label ?? item?.value?.toString())}</span
      >
    {/if}
    {#if style === VerticalSwitcherStyle.DOT && isActive}
      <div class="absolute bottom-1 left-0 flex justify-center w-full">
        <span class="h-1 w-1 bg-aps1 rounded-full" />
      </div>
    {/if}
  </HoverableElement>
</div>
