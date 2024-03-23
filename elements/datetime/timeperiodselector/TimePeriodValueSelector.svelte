<script lang="ts">
  import {
    TimePeriodType,
    TimeScale,
    type TimePeriodValue
  } from "$lib/tidy/types/time.type";
  import { timePeriodLabel } from "$lib/tidy/utils/time.utils";
  import FormControlLabel from "$lib/tidy/elements/text/formLabel/FormControlLabel.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let selectedScale: TimeScale;
  export let value: TimePeriodValue;
  $: segemets =
    selectedScale === TimeScale.DAYS
      ? [0, -1, -7, -14, -30]
      : selectedScale === TimeScale.WEEKS
        ? [0, -1, -4, -8, -12]
        : selectedScale === TimeScale.MONTHS
          ? [0, -1, -3, -6, -12]
          : [0, -1, -2, -3];
</script>

{#if value.type === TimePeriodType.RELATIVE}
  <div class="flex flex-col gap-2 items-start">
    <FormControlLabel label="Select Time Period" />
    {#each segemets as item}
      <button
        class="rounded-md px-4 py-2 w-48 {item == value.param
          ? 'bg-aps1 text-bgs1'
          : 'bg-bgs2'}"
        on:click={() => {
          value.type = TimePeriodType.RELATIVE;
          value.param = item;
          dispatch("update", value);
        }}
      >
        {timePeriodLabel({
          scale: selectedScale,
          value: {
            type: TimePeriodType.RELATIVE,
            param: item
          }
        })}
      </button>
    {/each}
  </div>
{/if}
