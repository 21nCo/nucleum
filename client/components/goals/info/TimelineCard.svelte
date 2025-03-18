<script lang="ts">
  import type { IActiveGoalStore } from "../goal.store";
  import { TimeScale } from "$lib/client/types/time.type";
  import { InputStyle } from "$lib/client/types/input.type";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import TimelineCardAxis from "./TimelineCardAxis.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import TimeSpan from "$lib/client/elements/datetime/TimeSpan.svelte";
  import {
    activeScales,
    resolveDefaultSpanScale
  } from "$lib/client/elements/datetime/datetime.utils";

  export let goal: IActiveGoalStore;

  $: startDate = $goal.startDate ? new Date($goal.startDate) : new Date();
  $: endDate = $goal.endDate ? new Date($goal.endDate) : new Date();

  $: if (!$goal.spanScale && $goal.startDate && $goal.endDate) {
    const spanScale = resolveDefaultSpanScale(startDate, endDate, activeScales);
    if (spanScale) {
      goal.modify({
        spanScale
      });
    }
  }

  function handleStartDateChange(e: CustomEvent) {
    $goal.startDate = e.detail;
    goal.modify({
      startDate: e.detail
    });
  }

  function handleEndDateChange(e: CustomEvent) {
    $goal.endDate = e.detail;
    goal.modify({
      endDate: e.detail
    });
  }

  function handleSpanChange(e: CustomEvent<TimeScale>) {
    goal.modify({
      spanScale: e.detail
    });
  }
</script>

<div
  class="flex flex-col gap-4 rounded-md border border-brs3 px-3 py-4 userdata"
>
  <div class="flex gap-2 justify-between w-full text-fgs3 text-b2 underline">
    <DatePicker
      date={startDate}
      style={InputStyle.PLAIN}
      variant="inline"
      on:change={handleStartDateChange}
    />
    <DatePicker
      date={endDate}
      style={InputStyle.PLAIN}
      variant="inline"
      on:change={handleEndDateChange}
    />
  </div>
  <Divider />
  <div class="flex flex-col gap-2">
    <div class="relative px-6">
      <TimelineCardAxis {startDate} {endDate} spanScale={$goal.spanScale} />
    </div>
  </div>

  {#if $goal.startDate && $goal.endDate}
    <div class="flex text-b3 text-fgs3 w-full justify-center">
      <TimeSpan
        scales={[
          TimeScale.DAYS,
          TimeScale.WEEKS,
          TimeScale.MONTHS,
          TimeScale.YEARS
        ]}
        start={new Date($goal.startDate)}
        end={new Date($goal.endDate)}
        spanScale={$goal.spanScale}
        on:change={handleSpanChange}
      />
    </div>
  {/if}
</div>
