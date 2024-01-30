<script lang="ts">
  import { CalendarView } from "$lib/tidy/types/CalendarHeatMap.enum";
  import { startTouch } from "$lib/tidy/utils/touchGesture";
  import MonthsHeader from "./MonthsHeader.svelte";
  import WeekDays from "./WeekDays.svelte";
  export let data: any;
  export let scale: CalendarView;
  export let numberOfColumns: number = 3;
</script>

<div
  class="VerticalCL"
  style:--times={scale === CalendarView.DAYS ? numberOfColumns : 0}
  style:--itemSize={scale === CalendarView.DAYS ? "28%" : "300px"}
  style:--columnGap={scale === CalendarView.DAYS ? "20px" : "0px"}
  style:--rowHeight={scale === CalendarView.YEARS
    ? "58px"
    : scale === CalendarView.MONTHS
      ? "30px"
      : undefined}
  on:touchstart={startTouch}
  on:touchmove
>
  {#if scale === CalendarView.MONTHS}
    <MonthsHeader />
  {/if}
  {#each Object.entries(data) as [slot, slotData], index}
    {#if scale === CalendarView.DAYS && (index == 0 || index % numberOfColumns == 0)}
      <WeekDays />
    {/if}
    <slot datum={[slot, slotData, index]} />
  {/each}
</div>

<style>
  .VerticalCL {
    display: grid;
    grid-template-columns: 20px repeat(var(--times, 3), var(--itemSize, 30%));
    grid-column-gap: var(--columnGap, 10px);
    grid-auto-rows: var(--rowHeight, auto);
    /* justify-content: stretch; */
    padding: 10px;
    align-items: center;
    /* border: 1px solid red; */
  }
</style>
