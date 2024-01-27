<script lang="ts">
  import { startTouch } from "$lib/tidy/utils/touchGesture";
  import MonthsHeader from "./MonthsHeader.svelte";
  import WeekDays from "./WeekDays.svelte";
  export let data: any;
  export let isDaysLayout: boolean = false;
  export let isMonthsLayout: boolean = false;
</script>

<div class="VerticalCL" on:touchstart={startTouch} on:touchmove>
  {#if isMonthsLayout}
    <MonthsHeader />
  {/if}
  {#each Object.entries(data) as [slot, slotData], index}
    {#if isDaysLayout && (index == 0 || index % 3 == 0)}
      <WeekDays />
    {/if}
    <slot datum={[slot, slotData]} />
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
