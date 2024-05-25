<script lang="ts">
  import { plainCSSHMColorIndex5 } from "$lib/client/stores/app.store";
  import MacroIndicatorTIle from "./MacroIndicatorTIle.svelte";
  import { TileAppearance } from "./calendarHeatmap.types";
  export let data: any;
  let [QD, QDData] = data;
</script>

<div id={QD} class="quad">
  {#each QDData as yearData, index (index)}
    <MacroIndicatorTIle
      data={yearData}
      --tileBgColor={yearData.color}
      tileValue={yearData.display == TileAppearance.FTile ||
      yearData.display == TileAppearance.LTile
        ? "🔥"
        : ""}
      --topThreadColor={yearData.display == TileAppearance.LTile ||
      yearData.display == TileAppearance.MTile
        ? $plainCSSHMColorIndex5
        : ""}
      --bottomThreadColor={yearData.display == TileAppearance.FTile ||
      yearData.display == TileAppearance.MTile
        ? $plainCSSHMColorIndex5
        : ""}
    />
  {/each}
</div>

<style>
  .quad {
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(4, auto);
    /* border: 1px solid blue; */
  }
</style>
