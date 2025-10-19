<script lang="ts">
  import type { SessionComposition } from "@21n/types/pointron/sessionComposition.type";
  import PresetItem from "@21n/products/pointron/focus/advanced/presets/PresetItem.svelte";
  import { pointronPreferences } from "@21n/products/pointron/pointron.store";
  import { createEventDispatcher, onMount } from "svelte";
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import { compareObjects } from "@21n/shared-utils/obj.utils";
  const dispatch = createEventDispatcher();
  export let parentBackgroundIndex = 1;
  export let isExpandedVariant: boolean = true;
  export let isInEditMode: boolean = false;
  export let isSettingsContext: boolean = false;
  let selectedPresetIndex: number = -1;
  let selectedPreset: SessionComposition;
  function presetClickHandler(event: any) {
    selectedPreset = event.detail.preset;
    selectedPresetIndex = resolveSelectedPresetIndex(selectedPreset);
    if (!isInEditMode) {
      dispatch("select", { preset: event.detail.preset });
      return;
    }
    // showEditor(selectedPreset.id);
    dispatch("edit", selectedPreset);
  }

  onMount(() => {
    if (!isInEditMode) {
      const index = resolveSelectedPresetIndex($activeSession.composition);
      if (index !== -1) {
        const isUnaltered = compareObjects(
          $activeSession.composition,
          $pointronPreferences.presets[index]
        );
        if (isUnaltered) {
          selectedPresetIndex = index;
        }
      }
    }
  });

  function resolveSelectedPresetIndex(preset: SessionComposition) {
    return $pointronPreferences.presets.findIndex((x) => x.id === preset.id);
  }
</script>

<!-- <div
  class={cn("flex flex-grow w-full", {
    "flex-col items-center gap-3 overflow-y-auto": isExpandedVariant,
    "flex-row gap-2 overflow-x-auto": !isExpandedVariant
  })}
> -->
{#each $pointronPreferences.presets as preset, index (preset.id)}
  <PresetItem
    preset={{ ...preset }}
    {parentBackgroundIndex}
    {isInEditMode}
    {isExpandedVariant}
    {isSettingsContext}
    isActive={selectedPresetIndex === index && !isInEditMode}
    on:click={presetClickHandler}
  />
{/each}
<!-- </div> -->
