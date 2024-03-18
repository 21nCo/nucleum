<script lang="ts">
  import view from "$lib/tidy/stores/view.store";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import {
    OptionSelectorStyle,
    type SwitchItem
  } from "$lib/tidy/types/switcher.enum";
  import { properCase } from "$lib/tidy/utils/text.utils";
  import Icon from "../Icon.svelte";
  export let item: SwitchItem;
  export let size: Size;
  export let isActive: boolean = false;
  export let style: OptionSelectorStyle = OptionSelectorStyle.TRAIN;
  export let orientation: Orientation = Orientation.Horizontal;
</script>

{#if style === OptionSelectorStyle.TRAIN || style === OptionSelectorStyle.OUTLINE}
  <button
    class="relative rounded-md {style === OptionSelectorStyle.TRAIN
      ? 'flex grow justify-center outline'
      : 'border-2'} {orientation === Orientation.Horizontal
      ? size === Size.xl
        ? ' px-12 py-8'
        : size === Size.md
          ? ' px-8 py-4'
          : ' px-3 py-1 '
      : size === Size.xl
        ? ' px-8 py-6'
        : size === Size.md
          ? ' px-6 py-4'
          : ' px-3 py-1 '} {isActive
      ? 'activeBgColor'
      : 'outline-transparent border-brs3'}"
    on:click
  >
    <div
      class="flex {orientation === Orientation.Vertical
        ? 'flex-col gap-1'
        : 'gap-2'} {size === Size.md && $view.isPortrait
        ? 'text-base font-medium'
        : size === Size.sm
          ? 'text-b2'
          : 'text-base'}"
    >
      {#if item.icon}
        <Icon icon={item.icon} {isActive} />
      {/if}
      {properCase(item.label)}
    </div>
  </button>
{/if}

<style>
  .activeBgColor {
    background-color: var(--customcolor, rgba(var(--colors-aps1), 0.05));
    outline-color: var(--customcolor, rgba(var(--colors-aps1), 0.4));
    border-color: var(--customcolor, rgba(var(--colors-aps1), 0.4));
  }
</style>
