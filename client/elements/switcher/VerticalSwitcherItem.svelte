<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Orientation, Position } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { VerticalSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import HoverableElement from "../HoverableElement.svelte";
  export let item: ISelectItem;
  export let style: VerticalSwitcherStyle = VerticalSwitcherStyle.BAR;
  export let labelOrientation: Orientation = Orientation.Vertical;
  export let activeStatusPlacement: Position = Position.Left;
  export let isHideLabel: boolean = false;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let isActive: boolean = false;
  export let isHideBar: boolean = false;
  // $: console.log({ isActive, item });
  let activeClasses: string;
  let inactiveClasses: string;
  let sizeClasses: string;
  $: commonVerticalLabelOptions = {
    tooltip: isHideLabel
      ? properCase(item.label ?? item.value?.toString())
      : undefined,
    tooltipOptions: {
      placement: Position.Left
    }
  };
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

  $: if (size) {
    if (size === Size.xs) {
      sizeClasses = "text-b5 w-16 gap-1 py-3";
    } else if (size === Size.sm) {
      sizeClasses = "text-b4 gap-1 py-4";
      if (isHideLabel) sizeClasses += " px-2";
      else sizeClasses += " w-[4.5rem]";
    } else if (size === Size.md) {
      sizeClasses = "text-b2 gap-2 py-4";
      if (isHideLabel) sizeClasses += " px-3";
      else sizeClasses += " w-24";
    } else if (size === Size.lg) {
      sizeClasses = "text-base w-24 gap-2 px-4 py-6";
    }
  }

  $: renderedIcon =
    isActive && item.icon?.includes(":")
      ? item.icon?.replace("-thin", "-fill")
      : item.icon;
</script>

{#if style === VerticalSwitcherStyle.BAR && labelOrientation === Orientation.Vertical}
  <HoverableElement
    type="button"
    class={cn("relative flex flex-col items-center", sizeClasses, {
      "border-ccs1 border-rounded-md": isActive,
      "text-fgs3": !isActive,
      "border-l-bgs2": !isActive && activeStatusPlacement === Position.Left,
      "border-r-bgs2": !isActive && activeStatusPlacement === Position.Right,
      "border-l-4": !isHideBar && activeStatusPlacement === Position.Left,
      "border-r-4": !isHideBar && activeStatusPlacement === Position.Right
    })}
    {...commonVerticalLabelOptions}
    on:click
  >
    {#if item.icon && typeof item.icon === "string"}
      <Icon
        icon={renderedIcon}
        {size}
        class={cn({
          "fill-fgs1": isActive,
          "stroke-fgs3": !isActive
        })}
      />
    {/if}
    <slot />
    {#if !isHideLabel}
      <span class="w-min whitespace-nowrap {isActive ? 'font-medium' : ''}"
        >{properCase(item?.label ?? item?.value?.toString())}</span
      >
    {/if}
  </HoverableElement>
{:else if style === VerticalSwitcherStyle.DOT && labelOrientation === Orientation.Vertical}
  <HoverableElement
    type="button"
    class={cn("relative flex flex-col items-center", sizeClasses)}
    {...commonVerticalLabelOptions}
    on:click
  >
    {#if item.icon && typeof item.icon === "string"}
      <Icon
        icon={renderedIcon}
        {size}
        class={cn({
          "fill-aps1": isActive,
          "stroke-fgs3": !isActive
        })}
      />
    {/if}
    <slot />
    {#if !isHideLabel}
      <span
        class={cn("w-min whitespace-nowrap", {
          "text-aps1 font-medium": isActive
        })}>{properCase(item?.label ?? item?.value?.toString())}</span
      >
    {/if}
    {#if isActive}
      <div class="absolute bottom-1 left-0 flex justify-center w-full">
        <span class="h-1 w-1 bg-aps1 rounded-full" />
      </div>
    {/if}
  </HoverableElement>
{:else if labelOrientation === Orientation.Vertical}
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
      class={cn("relative flex items-center", sizeClasses, {
        "flex-col": labelOrientation === Orientation.Vertical,
        [activeClasses]: isActive,
        [inactiveClasses]: !isActive,
        "border-ccs1": isActive,
        "bg-aps1": style === VerticalSwitcherStyle.BG && isActive
      })}
      {...commonVerticalLabelOptions}
      on:click
    >
      {#if item.icon && typeof item.icon === "string"}
        <Icon
          icon={renderedIcon}
          {size}
          class={cn({
            "fill-fgs1": isActive && style === VerticalSwitcherStyle.GRADIENT,
            "fill-aps1": isActive && style === VerticalSwitcherStyle.BG,
            "stroke-fgs3": !isActive
          })}
        />
      {/if}
      <slot />
      {#if !isHideLabel}
        <span class="w-min whitespace-nowrap {isActive ? 'font-medium' : ''}"
          >{properCase(item?.label ?? item?.value?.toString())}</span
        >
      {/if}
    </HoverableElement>
  </div>
{:else if style === VerticalSwitcherStyle.BG && labelOrientation === Orientation.Horizontal}
  <HoverableElement
    type="button"
    class={cn("relative flex gap-2 items-center rounded-md p-2 px-2 w-full", {
      "bg-bgs3": isActive,
      "text-fgs3": !isActive
    })}
    {...commonVerticalLabelOptions}
    on:click
  >
    {#if item.icon && typeof item.icon === "string"}
      <Icon
        icon={renderedIcon}
        size={Size.sm}
        class={cn({
          "fill-fgs1": isActive,
          "stroke-fgs3": !isActive
        })}
      />
    {/if}
    <slot />
    <span class="w-min whitespace-nowrap {isActive ? 'font-medium' : ''}"
      >{properCase(item?.label ?? item?.value?.toString())}</span
    >
  </HoverableElement>
{/if}
