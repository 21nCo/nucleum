<script lang="ts">
  import MicroIndicatorTile from "./MicroIndicatorTile.svelte";
  import { plainCSSHMColorIndex5 } from "$lib/client/stores/app.store";
  import { TileAppearance } from "./calendarHeatmap.types";
  // export let view: "V1" | "V2";
  // export const days = 30;
  export let data: any;
  let [monthName, monthData, index] = data;
  let firstDay: any;
  let year = "";
  $: {
    [monthName, monthData] = data;
    // console.log("months layout", data[1][0].date, monthData[0].date);
    firstDay = new Date(monthData[0].date).getDay();
    firstDay = firstDay == 0 ? 7 : firstDay;
    year = monthData[0].date.split("-")[0];
    year = " " + year[2] + year[3];
  }
</script>

<div class="py-2">
  <span class="p-1 text-fgs2 text-b2">
    {monthName}
    {index === 0 || monthName === "Jan" ? year : ""}
    <!-- {year} -->
  </span>
  <div class="month">
    <MicroIndicatorTile
      data={monthData[0]}
      classList="firstDay"
      --height="3px"
      --tileBgColor={monthData[0].color}
      --startDay={firstDay}
      tileValue={monthData[0].display == TileAppearance.FTile ||
      monthData[0].display == TileAppearance.LTile
        ? "🔥"
        : ""}
      --topThreadColor={monthData[0].display == TileAppearance.LTile ||
      monthData[0].display == TileAppearance.MTile
        ? $plainCSSHMColorIndex5
        : ""}
      --bottomThreadColor={monthData[0].display == TileAppearance.FTile ||
      monthData[0].display == TileAppearance.MTile
        ? $plainCSSHMColorIndex5
        : ""}
    />
    {#each monthData.slice(1) as daydata, index (index)}
      <MicroIndicatorTile
        data={daydata}
        --height="3px"
        --tileBgColor={daydata.color}
        tileValue={daydata.display == TileAppearance.FTile ||
        daydata.display == TileAppearance.LTile
          ? "🔥"
          : ""}
        --topThreadColor={daydata.display == TileAppearance.LTile ||
        daydata.display == TileAppearance.MTile
          ? $plainCSSHMColorIndex5
          : ""}
        --bottomThreadColor={daydata.display == TileAppearance.FTile ||
        daydata.display == TileAppearance.MTile
          ? $plainCSSHMColorIndex5
          : ""}
      />
    {/each}
  </div>
</div>

<style>
  .month {
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(7, auto);
    align-items: normal;
    /* gap: 8px 4px; */
    /* grid-template-columns: repeat(5,auto); */
    /* border: 1px solid blue; */
  }
</style>
