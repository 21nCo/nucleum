<script lang="ts">
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import { resolveBackgroundClass, bgClass } from "$lib/tidy/utils/theme.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import PanelSwitcherItem from "./PanelSwitcherItem.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import appearance from "$lib/tidy/stores/appearance.store";
  const dispatch = createEventDispatcher();
  export let items: string[];
  export let selected: string | undefined = undefined;
  export let activeColor: number | undefined = undefined;
  export let isDisableEnabled: boolean = false;
  export let parentBackgroundIndex: number = 1;
  export let size: Size = Size.md;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.DEFAULT;
  let backgroundColor: string = "";
  let classList: string = "flex ";
  onMount(() => {
    if (selected === undefined) selected = items[0];
    let colors = resolveBackgroundClass(parentBackgroundIndex);
    backgroundColor = colors.backgroundColor;
    switch (style) {
      case PanelSwitcherStyle.DOT:
        if (size === Size.md || size === Size.lg) {
          classList += " gap-6 items-center ";
        } else if (size === Size.sm) {
          classList += " p-1 gap-6 items-center justify-around ";
        }

        break;
      case PanelSwitcherStyle.TRAIN:
        if (size === Size.md) {
          classList +=
            " min-w-fit border-2 border-brs3 rounded-full " +
            bgClass($appearance, parentBackgroundIndex);
        } else if (size === Size.sm) {
          classList +=
            " min-w-fit rounded-md border border-brs3 " +
            bgClass($appearance, parentBackgroundIndex);
        }
        break;
      case PanelSwitcherStyle.DEFAULT:
        classList += " gap-4 rounded-full ";
        break;
      default:
        classList += " items-center ";
        break;
    }
  });
</script>

<div
  class="relative {style === PanelSwitcherStyle.BAR ? 'w-full' : 'max-w-fit'}"
>
  <div class={classList}>
    {#each items as item, index}
      <PanelSwitcherItem
        {item}
        {size}
        {activeColor}
        {style}
        isActive={selected === item}
        isDisabled={isDisableEnabled && selected !== item}
        on:click={() => {
          selected = item;
          dispatch("switch", item);
        }}
      />
    {/each}
  </div>
  <!-- {#if style === PanelSwitcherStyle.BOTTOMBAR || style === PanelSwitcherStyle.BOTTOMBAR_MINI}
    <div
      class="absolute w-full left-0 -bottom-1 {bgClass(
        $userPreferences.theme,
        2
      )}"
      style="height: 5%;"
    />
  {/if} -->
</div>
