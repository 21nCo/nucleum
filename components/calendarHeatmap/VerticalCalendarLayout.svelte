<script lang="ts">
  import { startTouch } from "$lib/tidy/utils/touchGesture";
  import MonthsHeader from "./MonthsHeader.svelte";
  import WeekDays from "./WeekDays.svelte";
  import { TileScale } from "./calendarHeatmap.types";
  export let data: any;
  export let scale: TileScale;
  export let numberOfColumns: number = 3;
</script>

<div
  class="VerticalCL"
  style:--times={scale === TileScale.DAYS ? numberOfColumns : 0}
  style:--itemSize={scale === TileScale.DAYS ? "28%" : "300px"}
  style:--columnGap={scale === TileScale.DAYS ? "20px" : "0px"}
  style:--rowHeight={scale === TileScale.YEARS
    ? "58px"
    : scale === TileScale.MONTHS
      ? "30px"
      : undefined}
  on:touchstart={startTouch}
  on:touchmove
>
  {#if scale === TileScale.MONTHS}
    <MonthsHeader />
  {/if}
  {#each Object.entries(data) as [slot, slotData], index}
    {#if scale === TileScale.DAYS && (index == 0 || index % numberOfColumns == 0)}
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
