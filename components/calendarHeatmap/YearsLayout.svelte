<script lang="ts">
  import { plainCSSHMColorIndex5 } from "$lib/tidy/stores/app.store";
  import MicroIndicatorTile from "./MicroIndicatorTile.svelte";
  import { TileAppearance } from "./calendarHeatmap.types";
  export let data: any;
  let [year, yearData] = data;
</script>

<div class="yearHolder">
  {year}
  <div id={year} class="year">
    {#each yearData as monthData, index (index)}
      <MicroIndicatorTile
        data={monthData}
        --tileBgColor={monthData.color}
        tileValue={monthData.display == TileAppearance.FTile ||
        monthData.display == TileAppearance.LTile
          ? "🔥"
          : ""}
        --topThreadColor={monthData.display == TileAppearance.LTile ||
        monthData.display == TileAppearance.MTile
          ? $plainCSSHMColorIndex5
          : ""}
        --bottomThreadColor={monthData.display == TileAppearance.FTile ||
        monthData.display == TileAppearance.MTile
          ? $plainCSSHMColorIndex5
          : ""}
      />
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
