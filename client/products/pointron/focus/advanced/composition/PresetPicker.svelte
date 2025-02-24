<script lang="ts">
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import { activeSession } from "$lib/client/products/pointron/focus/session.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import PresetItem from "../presets/PresetItem.svelte";
  import Presets from "../presets/Presets.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import ScrollView from "$lib/client/layout/scrollView/ScrollView.svelte";
  export let isExpandedVariant: boolean = false;
  let isInEditMode: boolean = false;
  let selectedPresetIndex: number = $activeSession.composition
    ? $pointronPreferences.presets.indexOf($activeSession.composition)
    : 0;
  export let parentBackgroundIndex: number = 1;

  function onPresetSelection(event: any) {
    const preset = event.detail.preset;
    activeSession.onPresetSelection(preset);
    selectedPresetIndex = $pointronPreferences.presets.indexOf(preset);
  }
</script>

<div class="flex flex-col w-full flex-grow gap-2">
  <div
    class="flex gap-2 h-full {isExpandedVariant
      ? 'w-full flex-col flex-grow'
      : 'w-72 md:w-96 lg:w-[30rem]'}"
  >
    <Presets
      {parentBackgroundIndex}
      {isExpandedVariant}
      {isInEditMode}
      on:select={onPresetSelection}
    />
  </div>
  <div class="flex flex-col items-center gap-2 min-h-[3rem]">
    {#if isExpandedVariant}
      <Button
        size={Size.sm}
        style={ButtonStyle.PLAIN}
        isUnderlined={true}
        on:click={() => {
          isInEditMode = !isInEditMode;
        }}
        >{isInEditMode ? "close editor" : "edit presets"}
      </Button>
    {:else}
      <button
        class="text-fgs3 text-b2 underline"
        on:click={() => {
          isInEditMode = !isInEditMode;
        }}>{isInEditMode ? "close editor" : "edit"}</button
      >
    {/if}

    {#if isInEditMode}
      <div class="flex w-full justify-center text-fgs4 text-b4">
        Tap to edit
      </div>
    {/if}
  </div>
</div>
