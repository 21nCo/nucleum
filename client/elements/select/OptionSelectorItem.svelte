<script lang="ts">
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { fade, scale } from "svelte/transition";
  import Icon from "../Icon.svelte";
  import { easeBackOut } from "d3";
  import {
    OptionSelectorStyle,
    type ISelectItem
  } from "$lib/client/types/select.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import AvatarRenderer from "../avatarPicker/AvatarRenderer.svelte";
  import TextWithHoverTooltip from "../text/TextWithHoverTooltip.svelte";
  import Badge from "../text/Badge.svelte";
  import { tooltip } from "$lib/client/actions/popover.action";
  export let item: ISelectItem;
  export let size: Size.lg | Size.md | Size.sm = Size.md;
  export let isActive: boolean = false;
  export let style: OptionSelectorStyle = OptionSelectorStyle.TRAIN;
  export let iconOrientation: Orientation = Orientation.Horizontal;
  export let isShowExpandFeedbackOnActive = false;
  export let isExpandOnActiveForIcon = false;
</script>

{#if style === OptionSelectorStyle.TRAIN || style === OptionSelectorStyle.OUTLINE || style === OptionSelectorStyle.ICON}
  <button
    class={cn(
      "relative rounded-md min-w-fit whitespace-nowrap border",
      {
        "flex justify-center rounded-[5.5px]":
          style === OptionSelectorStyle.ICON,
        "flex grow justify-center":
          style === OptionSelectorStyle.TRAIN ||
          style === OptionSelectorStyle.ICON,
        "outline-transparent border-brs3":
          !isActive && style === OptionSelectorStyle.OUTLINE,
        "border-transparent":
          !isActive &&
          (style === OptionSelectorStyle.TRAIN ||
            style === OptionSelectorStyle.ICON),
        "opacity-80 cursor-not-allowed": item.isDisabled,
        "notouch:hover:bg-bgs2 active:bg-bgs2 focus:bg-bgs2 focus:outline-bgs2":
          !isActive
      },
      style === OptionSelectorStyle.ICON && {
        "border border-aps2 bg-aps3": isActive,
        "p-1.5": size === Size.lg,
        "py-1 px-1.5": size === Size.md || size === Size.sm
      },
      style !== OptionSelectorStyle.ICON && {
        "border border-aps1 bg-aps3 hover:bg--aps2": isActive,
        "w-40": size === Size.lg,
        "w-36": size === Size.md,
        "px-3 py-1 text-b2": size === Size.sm,
        "px-12 py-8":
          iconOrientation === Orientation.Horizontal && size === Size.lg,
        "px-8 py-4":
          iconOrientation === Orientation.Horizontal && size === Size.md,
        "px-8 py-6":
          iconOrientation === Orientation.Vertical && size === Size.lg,
        "px-6 py-5":
          iconOrientation === Orientation.Vertical && size === Size.md,
        "w-20 px-3 py-3":
          iconOrientation === Orientation.Vertical && size === Size.sm
      }
    )}
    on:click
    use:tooltip={{
      disabled:
        (style !== OptionSelectorStyle.ICON && !item.tooltip) ||
        (isExpandOnActiveForIcon &&
          isActive &&
          style === OptionSelectorStyle.ICON),
      text: item.tooltip ?? item.label,
      delay: 1000,
      isLarger: true,
      isAllowTextWrap: true
    }}
    in:fade
  >
    <div
      class={cn("flex items-center", {
        "flex-col ": iconOrientation === Orientation.Vertical,
        "gap-3": size !== Size.sm && iconOrientation === Orientation.Vertical,
        "gap-2":
          iconOrientation === Orientation.Horizontal ||
          (size === Size.sm && iconOrientation === Orientation.Vertical),
        "portrait:text-base portrait:font-medium": size === Size.md,
        "text-b2": size === Size.sm,
        "text-base": size === Size.lg,
        "text-aps1": isActive,
        "text-fgs3": item.isDisabled
      })}
    >
      {#if item.icon && typeof item.icon === "string"}
        <Icon
          icon={item.icon}
          isFilled={isActive}
          class={cn({
            "fill-aps1": isActive && !item.isDisabled,
            "stroke-fgs1": !isActive && !item.isDisabled,
            "stroke-fgs3": item.isDisabled
          })}
          {size}
        />
      {:else if item.icon && typeof item.icon === "object"}
        <AvatarRenderer avatar={item.icon} {size} />
      {/if}
      <!-- <TextWithHoverTooltip
        text={properCase(item.label ?? item.value.toString())}
        truncateLength={20}
        tooltip={item.tooltip}
      /> -->
      {#if style !== OptionSelectorStyle.ICON || (isExpandOnActiveForIcon && isActive)}
        <div>
          {properCase(item.label ?? item.value.toString())}
        </div>
      {/if}
      {#if item.badge}
        <Badge text={item.badge} isAccentColor={isActive} {size} />
      {/if}
    </div>
    {#if isActive && isShowExpandFeedbackOnActive}
      <svg
        width="16"
        height="10"
        viewBox="0 0 16 10"
        class={cn("absolute left-1/2 -bottom-[5px] -translate-x-1/2")}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 7C2 7 4.5 7 8 7C11.5 7 14 7 14 7L8 1L2 7Z"
          class="stroke-aps1 fill-bgs1"
          stroke-width="1.2"
          stroke-linejoin="round"
        />
      </svg>
    {/if}
  </button>
{:else if style === OptionSelectorStyle.CHECK_CIRCLE}
  <button
    on:click
    class="flex gap-2 items-center {item.isDisabled && 'cursor-not-allowed'}"
  >
    <div
      class="rounded-full border w-4 h-4 min-w-[1rem] flex items-center justify-center {item.isDisabled
        ? 'border-fgs4'
        : isActive
          ? 'border-aps1'
          : 'border-fgs2'}"
    >
      {#if isActive}
        <div
          class="w-[0.7rem] h-[0.7rem] bg-aps1 rounded-full"
          in:scale={{ duration: 200, easing: easeBackOut }}
        />
      {/if}
    </div>
    <div class="w-full truncate text-left {item.isDisabled ? 'text-fgs4' : ''}">
      {properCase(item.label ?? item.value.toString())}
    </div>
  </button>
{/if}

<style>
  .active {
    background-color: var(--customcolor, rgba(var(--colors-aps1), 0.05));
    outline-color: var(--customcolor, rgba(var(--colors-aps1), 0.4));
    border-color: var(--customcolor, rgba(var(--colors-aps1), 0.4));
  }
</style>
