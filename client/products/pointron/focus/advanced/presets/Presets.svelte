<script lang="ts">
  import type { SessionComposition } from "@21n/types/pointron/sessionComposition.type";
  import PresetItem from "@21n/products/pointron/focus/advanced/presets/PresetItem.svelte";
  import { pointronPreferences } from "@21n/products/pointron/pointron.store";
  import { onMount } from "svelte";
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import { compareObjects } from "@21n/shared-utils/obj.utils";
  let {
    parentBackgroundIndex = 1,
    isExpandedVariant = true,
    isInEditMode = false,
    isSettingsContext = false,
    onEdit = undefined,
    onSelect = undefined
  }: {
    parentBackgroundIndex?: number;
    isExpandedVariant?: boolean;
    isInEditMode?: boolean;
    isSettingsContext?: boolean;
    onEdit?: ((event: CustomEvent<SessionComposition>) => void) | undefined;
    onSelect?:
      | ((event: CustomEvent<{ preset: SessionComposition }>) => void)
      | undefined;
  } = $props();
  let selectedPresetIndex: number = -1;
  let selectedPreset: SessionComposition;
  function presetClickHandler(event: any) {
    selectedPreset = event.detail.preset;
    selectedPresetIndex = resolveSelectedPresetIndex(selectedPreset);
    if (!isInEditMode) {
      const selectEvent = new CustomEvent<{ preset: SessionComposition }>(
        "select",
        {
          detail: { preset: event.detail.preset }
        }
      );
      onSelect?.(selectEvent);
      return;
    }
    const editEvent = new CustomEvent<SessionComposition>("edit", {
      detail: selectedPreset
    });
    onEdit?.(editEvent);
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
    onClick={presetClickHandler}
  />
{/each}
<!-- </div> -->
