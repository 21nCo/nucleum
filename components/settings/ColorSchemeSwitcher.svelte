<script lang="ts">
  import type { ColorScheme } from "$lib/tidy/types/appConstants.type";
  import Element from "$lib/tidy/elements/Element.svelte";
  import { createEventDispatcher, onMount } from "svelte";
  import { bg } from "$lib/tidy/utils/utils";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  export let colorSchemes: ColorScheme[];
  export let parentBackgroundIndex: number;
  export let selected: number;
  const dispatch = createEventDispatcher();
  function getColors(colorScheme: ColorScheme) {
    return [
      colorScheme.colors.bgs1 ?? "",
      colorScheme.colors.bgs2 ?? "",
      colorScheme.colors.bgs3 ?? "",
      colorScheme.colors.accent1 ?? "",
    ];
  }
  function onClicked(index: number) {
    selected = index;
    dispatch("switch", { selected });
  }
</script>

{#if colorSchemes && colorSchemes.length > 0}
  <div class="flex flex-wrap gap-4">
    {#each colorSchemes as colorScheme, index}
      <button
        on:click={() => {
          onClicked(index);
        }}
        class="relative flex flex-col items-center gap-1 p-2 rounded-md hover:{bg(
          $userPreferences.theme,
          1,
          true
        )} {selected === index
          ? bg($userPreferences.theme, 1, true)
          : bg($userPreferences.theme, 1)}"
      >
        {#if getColors(colorScheme)}
          <div class="flex">
            {#each getColors(colorScheme) as color, colorIndex}
              <div
                class="w-5 h-5 {colorIndex === 0
                  ? 'rounded-l'
                  : colorIndex === getColors(colorScheme).length - 1
                  ? 'rounded-r'
                  : ''}"
                style="background-color: {color}"
              />
            {/each}
          </div>
        {/if}
        {colorScheme.label}
        {#if selected === index}
          <div
            class="active-marker absolute border-2 inset-0 left-0 top-0 rounded-lg border-fgs3"
          />
        {/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  .active-marker {
    height: calc(100% + 8px);
    width: calc(100% + 8px);
    margin: -4px;
  }
</style>
