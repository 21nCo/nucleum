<script lang="ts">
  import MicroIndicatorTile from "./MicroIndicatorTile.svelte";
  import { TileAppearance } from "$lib/tidy/types/CalendarHeatMap.enum";
  export let view: "V1" | "V2";
  // export const days = 30;
  export let data: any;
  let [monthName, monthData] = data;
  let firstDay: any;
  let year = "";

  $: {
    [monthName, monthData] = data;
    // console.log("months layout", data[1][0].date, monthData[0].date);
    firstDay = new Date(monthData[0].date).getDay();
    firstDay = firstDay == 0 ? 7 : firstDay;
    if (view == "V2") {
      year = monthData[0].date.split("-")[0];
      year = "-" + year[2] + year[3];
    }
  }
</script>

<div class="monthHolder">
  {monthName}{year}
  <div class="month">
    <MicroIndicatorTile
      data={monthData[0]}
      classList="firstDay"
      --tileBgColor={monthData[0].color}
      --startDay={firstDay}
      tileValue={monthData[0].display == TileAppearance.FTile ||
      monthData[0].display == TileAppearance.LTile
        ? "🔥"
        : ""}
      --topThreadColor={monthData[0].display == TileAppearance.LTile ||
      monthData[0].display == TileAppearance.MTile
        ? "black"
        : ""}
      --bottomThreadColor={monthData[0].display == TileAppearance.FTile ||
      monthData[0].display == TileAppearance.MTile
        ? "black"
        : ""}
    />
    {#each monthData.slice(1) as daydata, index (index)}
      <MicroIndicatorTile
        data={daydata}
        --tileBgColor={daydata.color}
        tileValue={daydata.display == TileAppearance.FTile ||
        daydata.display == TileAppearance.LTile
          ? "🔥"
          : ""}
        --topThreadColor={daydata.display == TileAppearance.LTile ||
        daydata.display == TileAppearance.MTile
          ? "black"
          : ""}
        --bottomThreadColor={daydata.display == TileAppearance.FTile ||
        daydata.display == TileAppearance.MTile
          ? "black"
          : ""}
      />
    {/each}
  </div>
</div>

<style>
  .monthHolder {
    text-align: center;
    font-size: 14px;
  }
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
