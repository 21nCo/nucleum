<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import {
    generateBackgroudColor,
    retrieveCurrentColors,
  } from "$lib/tidy/utils/utils";
  import { createEventDispatcher, onMount } from "svelte";
  import PanelSwitcherItem from "./PanelSwitcherItem.svelte";
  const dispatch = createEventDispatcher();
  export let items: string[];
  export let selectedIndex: number | undefined = undefined;
  export let activeColor: string | undefined = undefined;
  export let isDisableEnabled: boolean = false;
  export let parentBackgroundIndex: number = 1;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.DEFAULT;
  let backgroundColor: string = "";
  let classList: string;
  onMount(() => {
    if (selectedIndex === undefined) selectedIndex = 0;
    let colors = generateBackgroudColor(parentBackgroundIndex);
    let currentColors = retrieveCurrentColors($userPreferences);
    if (!activeColor && currentColors) activeColor = currentColors.accent1;
    backgroundColor = colors.backgroundColor;
    switch (style) {
      case PanelSwitcherStyle.BOTTOMBAR:
        classList = "flex items-center w-full";
        break;
      case PanelSwitcherStyle.BOTTOMDOT:
        classList = "flex gap-6 items-center w-full";
        break;
      case PanelSwitcherStyle.DEFAULT:
        classList = "flex gap-4 w-full rounded-full";
        break;
      default:
        classList = "flex items-center w-full";
        break;
    }
  });
</script>

<div class={classList}>
  {#each items as item, index}
    <PanelSwitcherItem
      {item}
      {activeColor}
      {style}
      isActive={selectedIndex === index}
      isDisabled={isDisableEnabled && selectedIndex !== index}
      on:click={() => {
        dispatch("switch", { selected: index });
      }}
    />
  {/each}
</div>
