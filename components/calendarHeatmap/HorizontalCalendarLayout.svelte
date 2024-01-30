<script lang="ts">
  import { CalendarView } from "$lib/tidy/types/CalendarHeatMap.enum";
  import { startTouch } from "$lib/tidy/utils/touchGesture";
  import WeekDays from "./WeekDays.svelte";
  export let scale: CalendarView;
  export let data: any;
</script>

<div
  style:--times={scale != CalendarView.MONTHS ? 12 : 22}
  style:--itemSize={scale === CalendarView.YEARS
    ? "85px"
    : scale === CalendarView.MONTHS
      ? "44px"
      : "7%"}
  style:--columnGap={scale === CalendarView.YEARS
    ? "7px"
    : scale === CalendarView.MONTHS
      ? "4px"
      : "20px"}
  on:touchstart={startTouch}
  on:touchmove
>
  {#if scale === CalendarView.DAYS}
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
