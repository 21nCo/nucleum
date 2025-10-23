<script lang="ts">
  import MicroIndicatorTile from "@21n/components/calendar/calendarHeatmap/MicroIndicatorTile.svelte";
  export let data: any;
  let [year, yearData] = data;
</script>

<div class="yearHolder">
  {year}
  <div id={year} class="year">
    {#each yearData as monthData, index (index)}
      <MicroIndicatorTile data={monthData} />
    {/each}
  </div>
</div>

<style>
  .yearHolder {
    text-align: center;
    margin-bottom: 24px;
  }
  .year {
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(6, auto);
    justify-content: space-around;
    align-content: space-around;
    /* border: 1px solid blue; */
  }
</style>
