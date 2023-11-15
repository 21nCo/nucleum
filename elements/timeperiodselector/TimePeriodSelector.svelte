<script lang="ts">
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import {
    type TimePeriod,
    TimeScale,
    TimePeriodType,
  } from "$lib/tidy/types/time.type";
  import { createEventDispatcher } from "svelte";
  import Text from "../text/Text.svelte";
  import { properCase } from "$lib/tidy/utils/text.utils";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { timePeriodLabel } from "$lib/tidy/utils/time.utils";
  import FormControlLabel from "../text/FormControlLabel.svelte";
  const dispatch = createEventDispatcher();
  export let timePeriod: TimePeriod;
  let scales = $userPreferences.timeScales ?? Object.keys(TimeScale);
  let selectedScale = timePeriod.scale;
  $: segemets =
    selectedScale === TimeScale.DAYS
      ? [0, -1, -7, -14, -30]
      : selectedScale === TimeScale.WEEKS
      ? [0, -1, -4, -8, -12]
      : selectedScale === TimeScale.MONTHS
      ? [0, -1, -3, -6, -12]
      : [0, -1, -2, -3];
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
          timePeriod.type = TimePeriodType.RELATIVE;
          dispatch("update", timePeriod);
        }}
      >
        {properCase(scale)}
      </button>
    {/each}
  </div>
  <div class="h-full w-1 border border-bgs3" />
  <div class="flex flex-col gap-2 items-start">
    <FormControlLabel label="Select Time Period" />
    {#each segemets as item}
      <button
        class="rounded-md px-4 py-2 w-48 {item == timePeriod.value
          ? 'bg-a1 text-bgs1'
          : 'bg-bgs2'}"
        on:click={() => {
          timePeriod.type = TimePeriodType.RELATIVE;
          timePeriod.value = item;
          dispatch("update", timePeriod);
        }}
      >
        {timePeriodLabel({
          scale: timePeriod.scale,
          value: item,
          type: TimePeriodType.RELATIVE,
        })}
      </button>
    {/each}
  </div>
</div>
