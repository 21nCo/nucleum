<script lang="ts">
  import type { SessionComposition } from "$lib/client/types/pointron/sessionComposition.type";
  import PresetItem from "./PresetItem.svelte";
  import { pointronPreferences } from "$lib/client/components/pointron/pointron.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { appStore } from "$lib/client/stores/app.store";
  export let parentBackgroundIndex = 1;
  export let isExpandedVariant: boolean = true;
  let selectedPresetIndex: number = -1;
  let selectedPreset: SessionComposition;
  function presetClickHandler(event: any) {
    selectedPreset = event.detail.preset;
    selectedPresetIndex = $pointronPreferences.presets.indexOf(selectedPreset!);
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

{#each $pointronPreferences.presets as preset, index}
  <PresetItem
    {preset}
    {parentBackgroundIndex}
    isInEditMode={true}
    {isExpandedVariant}
    isActive={selectedPresetIndex === index}
    on:click={presetClickHandler}
  />
{/each}
<div class={isExpandedVariant ? "pb-40" : ""}>
  <Button
    {parentBackgroundIndex}
    on:click={onAddNewClicked}
    width={isExpandedVariant ? "w-full max-w-md" : "w-28"}
    label="add new"
    icon="plus"
  />
</div>
