<script lang="ts">
  import { appStore, userPreferences } from "$lib/tidy/stores/app.store";
  import ThemeItemView from "./ThemeItemView.svelte";

  let selectedPresetIndex: number;
  $: selectedPresetIndex = $appStore.appConstants.themes.indexOf(
    $userPreferences.theme
  );
  function handleClick(event: any) {
    let preset = event.detail.label;
    $userPreferences.theme = preset;
  }
</script>

<div class="flex gap-2 overflow-auto w-full pb-2">
  {#each $appStore.appConstants.themes as label, index}
    <ThemeItemView
      {label}
      isActive={selectedPresetIndex === index}
      on:click={handleClick}
    />
  {/each}
</div>
