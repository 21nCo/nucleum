<script lang="ts">
  import type { IActiveTaskStore } from "../task.store";
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

  export let task: IActiveTaskStore;

  $: startDate = $task.startDate ? new Date($task.startDate) : new Date();
  $: endDate = $task.endDate ? new Date($task.endDate) : new Date();

  $: if (!$task.spanScale && $task.startDate && $task.endDate) {
    const spanScale = resolveDefaultSpanScale(startDate, endDate, activeScales);
    if (spanScale) {
      task.modify({
        spanScale
      });
    }
  }

  function handleStartDateChange(e: CustomEvent) {
    $task.startDate = e.detail;
    task.modify({
      startDate: e.detail
    });
  }

  function handleEndDateChange(e: CustomEvent) {
    $task.endDate = e.detail;
    task.modify({
      endDate: e.detail
    });
  }

  function handleSpanChange(e: CustomEvent<TimeScale>) {
    task.modify({
      spanScale: e.detail
    });
  }
</script>

<div class="flex flex-col gap-4 rounded-md border border-brs3 px-3 py-4">
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
      <TimelineCardAxis {startDate} {endDate} spanScale={$task.spanScale} />
    </div>
  </div>

  {#if $task.startDate && $task.endDate}
    <div class="flex text-b3 text-fgs3 w-full justify-center">
      <TimeSpan
        scales={[
          TimeScale.DAYS,
          TimeScale.WEEKS,
          TimeScale.MONTHS,
          TimeScale.YEARS
        ]}
        start={new Date($task.startDate)}
        end={new Date($task.endDate)}
        spanScale={$task.spanScale}
        on:change={handleSpanChange}
      />
    </div>
  {/if}
</div>
