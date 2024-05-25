<script lang="ts">
  import { plainCSSHMColorIndex5 } from "$lib/client/stores/app.store";
  import MicroIndicatorTile from "./MicroIndicatorTile.svelte";
  import { TileAppearance } from "./calendarHeatmap.types";
  export let data: any;
  let [year, yearData] = data;
  $: {
    [year, yearData] = data;
  }
</script>

<div class="yearHolder">
  {year}
  <div id={year} class="year">
    {#each yearData as monthData, index (index)}
      <MicroIndicatorTile
        data={monthData}
        --width="7px"
        --height="0.5px"
        --direction="row"
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
    display: flex;
    gap: 0px 8px;
    align-items: center;
    height: 44px;
    font-size: 12px;
    margin-bottom: 24px;
    /* border: 1px solid blue; */
  }
  .year {
    display: grid;
    grid-auto-flow: column;
    /* column-gap: 2px; */
    /* grid-template-columns: repeat(12, auto); */
    /* justify-content: space-around; */
    /* align-content: space-around; */
  }
</style>
