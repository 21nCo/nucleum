<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import { Orientation, Placement } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import { VerticalSwitcherStyle } from "@21n/types/switcher.enum";
  import { properCase } from "@21n/shared-utils/text.utils";
  import { bg, cn } from "@21n/utils/ui.utils";
  import type { ISelectItem } from "@21n/types/select.type";
  import HoverableElement from "@21n/elements/HoverableElement.svelte";
  import Badge from "@21n/elements/text/Badge.svelte";
  import { hoverable } from "@21n/actions/hover.action";
  import { tooltip } from "@21n/actions/popover.action";
  export let item: ISelectItem;
  export let style: VerticalSwitcherStyle = VerticalSwitcherStyle.BAR;
  export let labelOrientation: Orientation = Orientation.Vertical;
  export let activeStatusPlacement: Placement = Placement.Left;
  export let isHideLabel: boolean = false;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let isActive: boolean = false;
  export let isHideBar: boolean = false;
  export let parentBgIndex: number = 1;

  // $: console.log({ isActive, item });
  let activeClasses: string;
  let inactiveClasses: string;
  let sizeClasses: string;
  let isHovered: boolean = false;
  $: commonVerticalLabelOptions = {
    tooltip: isHideLabel
      ? properCase(item.label ?? item.value?.toString())
      : undefined,
    tooltipOptions: {
      placement: Placement.Left
    }
  };
  $: if (
    style === VerticalSwitcherStyle.GRADIENT &&
    activeStatusPlacement === Placement.Left
  ) {
    activeClasses =
      "border-l--2 border-l-bgs2 bg-gradient-to-l from-transparent to-aps3";
    inactiveClasses =
      "border-l--2 border-l-bgs2 text-fgs3 hover:bg-gradient-to-l from-transparent to-bgs3";
  } else if (
    style === VerticalSwitcherStyle.GRADIENT &&
    activeStatusPlacement === Placement.Right
  ) {
    activeClasses =
      "border-r--2 border-r-bgs2 bg-gradient-to-r from-transparent to-aps3";
    inactiveClasses =
      "border-r--2 border-r-bgs2 text-fgs3 hover:bg-gradient-to-r from-transparent to-bgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR_V2 &&
    activeStatusPlacement === Placement.Right
  ) {
    activeClasses = "border-r-4 border-rounded-md";
    inactiveClasses = "border-r-4 border-r-bgs1 text-fgs3";
  } else if (
    style === VerticalSwitcherStyle.BAR_V2 &&
    activeStatusPlacement === Placement.Left
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
</script>

{#if style === VerticalSwitcherStyle.BAR && labelOrientation === Orientation.Vertical}
  <HoverableElement
    type="button"
    class={cn("relative flex flex-col items-center", sizeClasses, {
      "border-ccs1 border-rounded-md": isActive,
      "text-fgs3": !isActive,
      "border-l-bgs2": !isActive && activeStatusPlacement === Placement.Left,
      "border-r-bgs2": !isActive && activeStatusPlacement === Placement.Right,
      "border-l-4": !isHideBar && activeStatusPlacement === Placement.Left,
      "border-r-4": !isHideBar && activeStatusPlacement === Placement.Right
    })}
    {...commonVerticalLabelOptions}
    on:click
  >
    {#if item.icon && typeof item.icon === "string"}
      <Icon
        icon={item.icon}
        {size}
        isFilled={isActive}
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
  <button
    class={cn("relative flex flex-col items-center", sizeClasses)}
    use:tooltip={{
      text: commonVerticalLabelOptions.tooltip,
      direction:
        commonVerticalLabelOptions.tooltipOptions?.placement ?? Placement.Left
    }}
    use:hoverable={{
      onHover: (isHoveredParam) => {
        isHovered = isHoveredParam;
      }
    }}
    on:click
  >
    {#if item.icon && typeof item.icon === "string"}
      <Icon
        icon={item.icon}
        {size}
        isFilled={isActive || isHovered}
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
    {#if item.badge}
      <div class="absolute bottom-2 right-1">
        <Badge text={item.badge} size={Size.sm} />
      </div>
    {/if}
  </button>
{:else if labelOrientation === Orientation.Vertical}
  <div
    class={cn({
      "border-l-2 border-l-bgs3":
        style === VerticalSwitcherStyle.BAR_V2 &&
        activeStatusPlacement === Placement.Left,
      "border-r-2 border-r-bgs3":
        style === VerticalSwitcherStyle.BAR_V2 &&
        activeStatusPlacement === Placement.Right
    })}
  >
    <HoverableElement
      type="button"
      class={cn("relative flex items-center", sizeClasses, {
        "flex-col": labelOrientation === Orientation.Vertical,
        [activeClasses]: isActive,
        [inactiveClasses]: !isActive,
        "border-ccs1 text-ccs1": isActive,
        "bg-aps1": style === VerticalSwitcherStyle.BG && isActive
      })}
      {...commonVerticalLabelOptions}
      bind:isHovering={isHovered}
      on:click
    >
      {#if item.icon && typeof item.icon === "string"}
        <Icon
          icon={item.icon}
          {size}
          isFilled={isActive || isHovered}
          class={cn({
            "fill-aps1": isActive,
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
      {#if item.badge}
        <div class="absolute bottom-2 right-1">
          <Badge text={item.badge} size={Size.sm} />
        </div>
      {/if}
    </HoverableElement>
  </div>
{:else if style === VerticalSwitcherStyle.BG && labelOrientation === Orientation.Horizontal}
  <HoverableElement
    type="button"
    bind:isHovering={isHovered}
    class={cn("relative flex gap-2 items-center rounded-md p-2 px-2 w-full", {
      [bg(parentBgIndex)]: isActive || isHovered,
      "text-fgs3": !isActive
    })}
    {...commonVerticalLabelOptions}
    on:click
  >
    {#if item.icon && typeof item.icon === "string"}
      <Icon
        icon={item.icon}
        {size}
        isFilled={isActive}
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
