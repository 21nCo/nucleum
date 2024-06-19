<script lang="ts">
  import type { SessionComposition } from "$lib/client/types/pointron/sessionComposition.type";
  import PresetItem from "./PresetItem.svelte";
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import ScrollView from "$lib/client/layout/scrollView/ScrollView.svelte";
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
    showEditor(selectedPreset.id);
  }
  function onAddNewClicked() {
    selectedPresetIndex = -1;
    showEditor();
  }
  function showEditor(id: string = "") {
    appStore.runAction(PointronEventEnum.EDIT_PRESET, { id });
  }
</script>

<ScrollView
  isEnableScrollbar={false}
  class="flex h-full w-full {isExpandedVariant
    ? 'flex-col items-center gap-3 overflow-y-auto'
    : 'flex-row gap-2 overflow-x-auto'}"
>
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
  {#if isInEditMode}
    <Button
      parentBgIndex={parentBackgroundIndex}
      on:click={onAddNewClicked}
      style={ButtonStyle.OUTLINED}
      size={Size.sm}
      width={isExpandedVariant ? "w-full max-w-md" : "w-28"}
      label="Add new preset"
      icon="plus"
    />
  {/if}
</ScrollView>
