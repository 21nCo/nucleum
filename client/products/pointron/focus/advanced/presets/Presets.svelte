<script lang="ts">
  import type { SessionComposition } from "$lib/client/types/pointron/sessionComposition.type";
  import PresetItem from "./PresetItem.svelte";
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let parentBackgroundIndex = 1;
  export let isExpandedVariant: boolean = true;
  export let isInEditMode: boolean = false;
  let selectedPresetIndex: number = -1;
  let selectedPreset: SessionComposition;
  function presetClickHandler(event: any) {
    selectedPreset = event.detail.preset;
    selectedPresetIndex = $pointronPreferences.presets.indexOf(selectedPreset!);
    if (!isInEditMode) {
      dispatch("select", { preset: event.detail.preset });
      return;
    }
    // showEditor(selectedPreset.id);
    dispatch("edit", selectedPreset);
  }
</script>

<!-- <div
  class={cn("flex flex-grow w-full", {
    "flex-col items-center gap-3 overflow-y-auto": isExpandedVariant,
    "flex-row gap-2 overflow-x-auto": !isExpandedVariant
  })}
> -->
{#each $pointronPreferences.presets as preset, index}
  <PresetItem
    {preset}
    {parentBackgroundIndex}
    {isInEditMode}
    {isExpandedVariant}
    isActive={selectedPresetIndex === index && !isInEditMode}
    on:click={presetClickHandler}
  />
{/each}
<!-- </div> -->
