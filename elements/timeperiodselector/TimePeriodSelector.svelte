<script lang="ts">
  import { TextType } from "$lib/tidy/types/text.enum";
  import {
    type TimePeriod,
    TimeScale,
    TimePeriodType,
  } from "$lib/tidy/types/time.type";
  import { createEventDispatcher } from "svelte";
  import Text from "../text/Text.svelte";
  const dispatch = createEventDispatcher();
  export let timePeriod: TimePeriod;
  let scales = Object.keys(TimeScale).filter(
    (key: any) => !isNaN(Number(TimeScale[key]))
  );
  let selectedScale = timePeriod.scale;
  let horizonsForSingleDay = [0, -1, -365];
  let numberOfSegmentsForDays = [7, 14, 30];
  let numberOfSegmentsForWeeks = [4, 8, 12];
  let numberOfSegmentsForMonths = [3, 6, 12];
  let numberOfSegmentsForYears = [1, 2, 3];
  $: console.log(scales);
  $: segemets =
    selectedScale === TimeScale.DAYS
      ? numberOfSegmentsForDays
      : selectedScale === TimeScale.WEEKS
      ? numberOfSegmentsForWeeks
      : selectedScale === TimeScale.MONTHS
      ? numberOfSegmentsForMonths
      : numberOfSegmentsForYears;

  function onHorizonTypeSelected() {}
</script>

<div class="flex gap-4 items-center h-96 w-1/2 p-8">
  <div class="flex flex-col gap-2 items-start">
    <Text style={TextType.FORM_LABEL}>SELECT TIME SCALE</Text>
    {#each scales as scale}
      <button
        class="rounded-md px-4 py-2 w-40 {TimeScale[selectedScale] === scale
          ? 'bg-a1 text-bgs1'
          : 'bg-bgs2'}"
        on:click={() => {
          selectedScale = TimeScale[scale];
          timePeriod.scale = selectedScale;
          timePeriod.type = TimePeriodType.LASTXSEGMENTS;
          console.log({ scale, selectedScale });
          dispatch("update", timePeriod);
        }}
      >
        {scale == TimeScale[TimeScale.SINGLEDAY]
          ? "single day"
          : scale.toLocaleLowerCase()}
      </button>
    {/each}
  </div>
  <div class="h-full w-1 border border-bgs3" />
  <div class="flex flex-col gap-2 items-start">
    <Text style={TextType.FORM_LABEL}>SELECT TIME PERIOD</Text>
    {#if selectedScale === TimeScale.SINGLEDAY}
      {#each horizonsForSingleDay as horizon}
        <button
          class="rounded-md px-4 py-2 w-48 {horizon == timePeriod.horizons[0]
            ? 'bg-a1 text-bgs1'
            : 'bg-bgs2'}"
          on:click={() => {
            timePeriod.type = TimePeriodType.UPPERHORIZON;
            timePeriod.horizons = [horizon];
            dispatch("update", timePeriod);
          }}
        >
          {horizon == 0 ? "today" : horizon == -1 ? "yesterday" : "last year"}
        </button>
      {/each}
    {:else}
      {#each segemets as item}
        <button
          class="rounded-md px-4 py-2 w-48 {item == timePeriod.numberOfSegments
            ? 'bg-a1 text-bgs1'
            : 'bg-bgs2'}"
          on:click={() => {
            timePeriod.numberOfSegments = item;
            dispatch("update", timePeriod);
          }}
        >
          Last {item}
          {TimeScale[selectedScale].toLocaleLowerCase()}
        </button>
      {/each}
    {/if}

    <!-- <button
      class="rounded-md px-4 py-2 w-48 {timePeriod.type ===
      TimePeriodType.UPPERHORIZON
        ? 'bg-a1 text-bgs1'
        : 'bg-bgs2'}"
      on:click={() => {
        timePeriod.type = TimePeriodType.UPPERHORIZON;
      }}
    >
      {TimeScale[selectedScale].toLocaleLowerCase()} of a {TimeScale[
        selectedScale + 1
      ]
        .toLocaleLowerCase()
        .slice(0, -1)}
    </button> -->
  </div>
  {#if timePeriod.type === TimePeriodType.UPPERHORIZON}
    <div />
  {/if}
</div>
