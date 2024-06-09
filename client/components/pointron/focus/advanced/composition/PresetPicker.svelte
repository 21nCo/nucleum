<script lang="ts">
  import { pointronPreferences } from "$lib/client/components/pointron/pointron.store";
  import { sessionStore } from "$lib/client/components/pointron/focus/session.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import PresetItem from "../presets/PresetItem.svelte";
  import Presets from "../presets/Presets.svelte";
  export let isExpandedVariant: boolean = false;
  let isInEditMode: boolean = false;
  let selectedPresetIndex: number = $sessionStore.composition
    ? $pointronPreferences.presets.indexOf($sessionStore.composition)
    : 0;
  export let parentBackgroundIndex: number = 1;

  function onPresetSelection(event: any) {
    const preset = event.detail.preset;
    sessionStore.onPresetSelection(preset);
    selectedPresetIndex = $pointronPreferences.presets.indexOf(preset);
  }
</script>

<div class="flex flex-col w-full flex-grow gap-2">
  <div
    class="flex gap-2 {isExpandedVariant
      ? 'w-full flex-col flex-grow'
      : 'w-72 md:w-96 lg:w-[30rem]'}"
  >
    <div
      class="flex h-full styledscroll {isExpandedVariant
        ? 'flex-col items-center gap-3 overflow-y-auto'
        : 'flex-row gap-2 overflow-x-auto'}"
    >
      {#if isInEditMode}
        <Presets {parentBackgroundIndex} {isExpandedVariant} />
      {:else}
        {#each $pointronPreferences.presets as preset, index}
          <PresetItem
            {parentBackgroundIndex}
            {preset}
            {isInEditMode}
            {isExpandedVariant}
            isActive={selectedPresetIndex === index}
            on:click={onPresetSelection}
          />
        {/each}
      {/if}
    </div>
  </div>
  <div class="flex flex-col items-center gap-2 min-h-[3rem]">
    {#if isExpandedVariant}
      <Button
        size={Size.sm}
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
