<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import { resolveBackgroundClass, bgClass } from "$lib/tidy/utils/theme.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import PanelSwitcherItem from "./PanelSwitcherItem.svelte";
  const dispatch = createEventDispatcher();
  export let items: string[];
  export let selected: string | undefined = undefined;
  export let activeColor: number | undefined = undefined;
  export let isDisableEnabled: boolean = false;
  export let parentBackgroundIndex: number = 1;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.DEFAULT;
  let backgroundColor: string = "";
  let classList: string = "flex ";
  onMount(() => {
    if (selected === undefined) selected = items[0];
    let colors = resolveBackgroundClass(parentBackgroundIndex);
    backgroundColor = colors.backgroundColor;
    switch (style) {
      case PanelSwitcherStyle.BOTTOMDOT:
        classList += "gap-6 items-center";
        break;
      case PanelSwitcherStyle.ACCENT_SWITCH:
        classList +=
          "min-w-fit rounded-full " +
          bgClass($userPreferences.theme, parentBackgroundIndex);
        break;
      case PanelSwitcherStyle.ACCENT_SWITCH_MINI:
        classList +=
          "min-w-fit rounded-md " +
          bgClass($userPreferences.theme, parentBackgroundIndex);
        break;
      case PanelSwitcherStyle.DEFAULT:
        classList += "gap-4 rounded-full";
        break;
      default:
        classList += " items-center";
        break;
    }
  });
</script>

<div
  class="relative {style === PanelSwitcherStyle.BOTTOMBAR
    ? 'w-full'
    : 'max-w-fit'}"
>
  <div class={classList}>
    {#each items as item, index}
      <PanelSwitcherItem
        {item}
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
