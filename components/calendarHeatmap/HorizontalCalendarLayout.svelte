<script lang="ts">
  import { startTouch } from "$lib/tidy/utils/touchGesture";
  import WeekDays from "./WeekDays.svelte";
  export let data: any;
  export let isDaysLayout: boolean = false;
</script>

<div on:touchstart={startTouch} on:touchmove>
  {#if isDaysLayout}
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
