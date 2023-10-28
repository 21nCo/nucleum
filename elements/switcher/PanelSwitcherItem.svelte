<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import { bg, retrieveCurrentColors } from "$lib/tidy/utils/theme.utils";
  export let item: string;
  export let isActive: boolean = false;
  export let isDisabled: boolean = false;
  export let activeColor: string | undefined = undefined;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.DEFAULT;
  $: currentColors = retrieveCurrentColors($userPreferences);
  $: defaultActiveColor = currentColors?.a1;
</script>

{#if style === PanelSwitcherStyle.BOTTOMBAR}
  <button
    class="flex relative px-2"
    on:click
    style={isActive ? "color: " + activeColor ?? defaultActiveColor : ""}
    disabled={isDisabled}
  >
    <div class="text-h5 font-medium {isActive ? '' : 'text-fgs4'}">
      {item}
    </div>
    {#if isActive}
      <div
        class="absolute opacity-80 w-full rounded-lg left-0 -bottom-1 z-10"
        style="height: 5%; background-color: {activeColor ??
          defaultActiveColor}"
      />
    {:else}
      <div
        class="absolute w-full {bg($userPreferences.theme, 1)} left-0 -bottom-1"
        style="height: 5%;"
      />
    {/if}
  </button>
{:else if style === PanelSwitcherStyle.BOTTOMDOT}
  <button
    class="relative min-w-fit"
    on:click
    style={isActive ? "color: " + activeColor ?? defaultActiveColor : ""}
    disabled={isDisabled}
  >
    <div class="text-h3 {isActive ? '' : 'text-fgs3'}">
      {item}
    </div>
    {#if isActive}
      <div
        class="absolute opacity-80 w-1 h-1 -bottom-1 rounded-full"
        style="left: 40%; background-color: {activeColor ?? defaultActiveColor}"
      />
    {/if}
  </button>
{/if}
