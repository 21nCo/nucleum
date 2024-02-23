<script lang="ts">
  import { PlainCSSHMColorIndex5 } from "$lib/tidy/stores/app.store";
  import { TileAppearance } from "$lib/tidy/types/CalendarHeatMap.enum";
  import MacroIndicatorTIle from "./MacroIndicatorTIle.svelte";
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
        ? $PlainCSSHMColorIndex5
        : ""}
      --bottomThreadColor={yearData.display == TileAppearance.FTile ||
      yearData.display == TileAppearance.MTile
        ? $PlainCSSHMColorIndex5
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
