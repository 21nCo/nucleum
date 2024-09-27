<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { properCase, truncateString } from "$lib/shared/utils/text.utils";
  import { fade, scale } from "svelte/transition";
  import Icon from "../Icon.svelte";
  import { easeBackOut, easeBounceIn, easeCircleIn } from "d3";
  import {
    OptionSelectorStyle,
    type ISelectItem
  } from "$lib/client/types/select.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import AvatarRenderer from "../avatarPicker/AvatarRenderer.svelte";
  import TextWithHoverTooltip from "../text/TextWithHoverTooltip.svelte";
  export let item: ISelectItem;
  export let size: Size.lg | Size.md | Size.sm = Size.md;
  export let isActive: boolean = false;
  export let style: OptionSelectorStyle = OptionSelectorStyle.TRAIN;
  export let iconOrientation: Orientation = Orientation.Horizontal;
</script>

{#if style === OptionSelectorStyle.TRAIN || style === OptionSelectorStyle.OUTLINE}
  <button
    class={cn("relative rounded-md min-w-fit whitespace-nowrap border", {
      "w-40": size === Size.lg,
      "w-36": size === Size.md,
      "flex grow justify-center": style === OptionSelectorStyle.TRAIN,
      "px-12 py-8":
        iconOrientation === Orientation.Horizontal && size === Size.lg,
      "px-8 py-4":
        iconOrientation === Orientation.Horizontal && size === Size.md,
      "px-8 py-6": iconOrientation === Orientation.Vertical && size === Size.lg,
      "px-6 py-5": iconOrientation === Orientation.Vertical && size === Size.md,
      "w-20 px-3 py-3":
        iconOrientation === Orientation.Vertical && size === Size.sm,
      "px-3 py-1 text-b2": size === Size.sm,
      "border border-aps1 bg-aps3 hover:bg--aps2": isActive,
      "outline-transparent border-brs3":
        !isActive && style === OptionSelectorStyle.OUTLINE,
      "border-transparent": !isActive && style === OptionSelectorStyle.TRAIN,
      "opacity-80 cursor-not-allowed": item.isDisabled,
      "hover:bg-bgs2": !isActive
    })}
    on:click
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
        "text-aps1": isActive
      })}
    >
      {#if item.icon && typeof item.icon === "string"}
        <Icon
          icon={item.icon}
          class={cn({
            "fill-aps1": isActive,
            "stroke-fgs1": !isActive
          })}
          {size}
        />
      {:else if item.icon && typeof item.icon === "object"}
        <AvatarRenderer avatar={item.icon} {size} />
      {/if}
      <TextWithHoverTooltip
        text={properCase(item.label ?? item.value.toString())}
        truncateLength={20}
      />
    </div>
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
