<script lang="ts">
  import view from "$lib/tidy/stores/view.store";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import { properCase } from "$lib/tidy/utils/text.utils";
  import { fade, scale } from "svelte/transition";
  import Icon from "../Icon.svelte";
  import { easeBackOut, easeBounceIn, easeCircleIn } from "d3";
  import {
    OptionSelectorStyle,
    type SelectItem
  } from "$lib/tidy/types/select.type";
  import { cn } from "$lib/tidy/utils/ui.utils";
  import AvatarView from "../avatarPicker/AvatarView.svelte";
  export let item: SelectItem;
  export let size: Size;
  export let isActive: boolean = false;
  export let style: OptionSelectorStyle = OptionSelectorStyle.TRAIN;
  export let iconOrientation: Orientation = Orientation.Horizontal;
</script>

{#if style === OptionSelectorStyle.TRAIN || style === OptionSelectorStyle.OUTLINE}
  <button
    class={cn("relative rounded-md hover:bg-bgs2", {
      "flex grow justify-center": style === OptionSelectorStyle.TRAIN,
      "border min-w-fit": style === OptionSelectorStyle.OUTLINE,
      "px-12 py-8":
        iconOrientation === Orientation.Horizontal && size === Size.xl,
      "px-8 py-4":
        iconOrientation === Orientation.Horizontal && size === Size.md,
      "px-8 py-6": iconOrientation === Orientation.Vertical && size === Size.xl,
      "px-6 py-4": iconOrientation === Orientation.Vertical && size === Size.md,
      "px-3 py-1": size === Size.sm,
      "border border-aps1 bg-bgs2": isActive,
      "outline-transparent border-brs3": !isActive
    })}
    on:click
  >
    <div
      class="flex {iconOrientation === Orientation.Vertical
        ? 'flex-col gap-1'
        : 'gap-2'} {size === Size.md && $view.isPortrait
        ? 'text-base font-medium'
        : size === Size.sm
          ? 'text-b2'
          : 'text-base'}"
    >
      {#if item.icon && typeof item.icon === "string"}
        <Icon icon={item.icon} {isActive} />
      {:else if item.icon && typeof item.icon === "object"}
        <AvatarView avatar={item.icon} {size} />
      {/if}
      {properCase(item.label ?? item.value)}
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
      {properCase(item.label ?? item.value)}
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
