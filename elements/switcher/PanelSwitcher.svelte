<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import { generateBackgroudColor, bg } from "$lib/tidy/utils/theme.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import PanelSwitcherItem from "./PanelSwitcherItem.svelte";
  const dispatch = createEventDispatcher();
  export let items: string[];
  export let selectedIndex: number | undefined = undefined;
  export let activeColor: number | undefined = undefined;
  export let isDisableEnabled: boolean = false;
  export let parentBackgroundIndex: number = 1;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.DEFAULT;
  let backgroundColor: string = "";
  let classList: string;
  onMount(() => {
    if (selectedIndex === undefined) selectedIndex = 0;
    let colors = generateBackgroudColor(parentBackgroundIndex);
    backgroundColor = colors.backgroundColor;
    switch (style) {
      case PanelSwitcherStyle.BOTTOMBAR:
        classList = "flex gap-4";
        break;
      case PanelSwitcherStyle.BOTTOMDOT:
        classList = "flex gap-6 items-center";
        break;
      case PanelSwitcherStyle.ROUNDED:
        classList =
          "flex rounded-full " +
          bg($userPreferences.theme, parentBackgroundIndex);
        break;
      case PanelSwitcherStyle.DEFAULT:
        classList = "flex gap-4 rounded-full";
        break;
      default:
        classList = "flex items-center";
        break;
    }
  });
</script>

<div class="relative {style === PanelSwitcherStyle.BOTTOMBAR && 'w-full'}">
  <div class={classList}>
    {#each items as item, index}
      <PanelSwitcherItem
        {item}
        {activeColor}
        {style}
        isActive={selectedIndex === index}
        isDisabled={isDisableEnabled && selectedIndex !== index}
        on:click={() => {
          selectedIndex = index;
          dispatch("switch", { selected: index });
        }}
      />
    {/each}
  </div>
  {#if style === PanelSwitcherStyle.BOTTOMBAR}
    <div
      class="absolute w-full left-0 -bottom-1 {bg($userPreferences.theme, 2)}"
      style="height: 5%;"
    />
  {/if}
</div>
