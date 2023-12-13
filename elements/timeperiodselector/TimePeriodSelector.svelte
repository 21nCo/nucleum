<script lang="ts">
  import {
    type TimePeriod,
    TimeScale,
    TimePeriodType,
  } from "$lib/tidy/types/time.type";
  import { createEventDispatcher } from "svelte";
  import { properCase } from "$lib/tidy/utils/text.utils";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import FormControlLabel from "../text/FormControlLabel.svelte";
  import TimePeriodValueSelector from "./TimePeriodValueSelector.svelte";
  const dispatch = createEventDispatcher();
  export let timePeriod: TimePeriod;
  let scales = $userPreferences.timeScales ?? Object.keys(TimeScale);
  let selectedScale = timePeriod.scale;

  $: console.log({ scales, timePeriod });
</script>

<div class="flex gap-4 items-center h-96 w-1/2 p-8">
  <div class="flex flex-col gap-2 items-start">
    <FormControlLabel label="Select Time Scale" />
    {#each scales as scale}
      <button
        class="rounded-md px-4 py-2 w-40 {TimeScale[selectedScale] === scale
          ? 'bg-a1 text-bgs1'
          : 'bg-bgs2'}"
        on:click={() => {
          selectedScale = TimeScale[scale];
          timePeriod.scale = selectedScale;
          timePeriod.value.type = TimePeriodType.RELATIVE;
          dispatch("update", timePeriod);
        }}
      >
        {properCase(scale)}
      </button>
    {/each}
  </div>
  <div class="h-full w-1 border border-bgs3" />
  <TimePeriodValueSelector
    {selectedScale}
    bind:value={timePeriod.value}
    on:update={(event) => {
      dispatch("update", timePeriod);
    }}
  />
</div>
