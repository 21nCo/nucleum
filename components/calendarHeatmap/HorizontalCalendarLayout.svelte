<script lang="ts">
  import { TileScale } from "./calendarHeatmap.types";
  import { startTouch } from "$lib/tidy/utils/touchGesture";
  import WeekDays from "./WeekDays.svelte";
  export let scale: TileScale;
  export let data: any;
</script>

<div
  style:--times={scale != TileScale.MONTHS ? 12 : 22}
  style:--itemSize={scale === TileScale.YEARS
    ? "85px"
    : scale === TileScale.MONTHS
      ? "44px"
      : "7%"}
  style:--columnGap={scale === TileScale.YEARS
    ? "7px"
    : scale === TileScale.MONTHS
      ? "4px"
      : "20px"}
  on:touchstart={startTouch}
  on:touchmove
>
  {#if scale === TileScale.DAYS}
    <WeekDays />
  {:else}
    <div><!-- place holder for the WeekDays gap--></div>
  {/if}

  {#each Object.entries(data) as [slot, slotData] (slot)}
    <slot datum={[slot, slotData]} />
  {/each}
</div>

<style>
  div {
    display: grid;
    grid-template-columns: 23px repeat(var(--times, 12), var(--itemSize, 7%));
    grid-column-gap: var(--columnGap, 10px);
    grid-auto-rows: minmax(126px, auto);
    justify-content: space-around;
    padding: 10px;
    /* border: 1px solid red; */
  }
</style>
