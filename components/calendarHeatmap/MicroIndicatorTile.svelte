<script lang="ts">
  import { CalendarHeatMapLayout } from "$lib/tidy/stores/app.store";
  import type {
    DailyData,
    MonthlyData
  } from "$lib/tidy/types/CalendarHeatMapData.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";

  export let data: DailyData | MonthlyData | {};
  export let classList: string = "";
  export let tileValue: string = "";
  let isActive: boolean = false;
  let monthTitles = [
    "J",
    "F",
    "M",
    "A",
    "M",
    "J",
    "J",
    "A",
    "S",
    "O",
    "N",
    "D"
  ];
  $: if (tileValue == "") {
    if ("date" in data) {
      tileValue = data.date.split("-")[2];
    } else if (
      $CalendarHeatMapLayout == Orientation.Horizontal &&
      "month" in data
    ) {
      let month: number = Number(data.month.split("-")[1]) - 1;
      tileValue = monthTitles[month];
    }
  }
</script>

<span class={classList}>
  <button
    id="MITile"
    class={isActive ? "border-2 border-fgs2" : ""}
    on:click={() => {
      isActive = !isActive;
    }}
  >
    <!-- dispatch required event on:click here-->
    <!-- {typeof +tileValue == "number" ? "" : tileValue} -->
    <!-- {tileValue === "🔥" ? tileValue : ""} -->
    {#if tileValue === "🔥"}
      <!-- 🔥 -->
      <!-- <div class="w-full h-full flex justify-center items-center">
        <Icon
          icon="bolt-micro"
          size={Size.xxs}
          selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
          isActive={true}
        />
      </div> -->
    {/if}
  </button>
</span>

<!-- <style>
  button {
    /* color: var(--colors-fg-s2, #545454); */
    font-size: 8px;
    height: 12px;
    width: 12px;
    background-color: var(--tileBgColor);
    border-radius: 3px;
  }
  .firstDay {
    grid-row: var(--startDay);
  }
  span {
    display: flex;
    flex-direction: row;
    /* justify-self: center; */
    align-items: center;
    border: 1px solid red;
  }
  span::before {
    content: "";
    height: 0.5px;
    width: 4.25px;
    background-color: var(--topThreadColor, inherit);
  }
  span::after {
    content: "";
    height: 0.5px;
    width: 4.25px;
    background-color: var(--bottomThreadColor, inherit);
  }
</style> -->

<style>
  button {
    /* color: var(--colors-fg-s2, #545454); */
    font-size: 8px;
    height: 12px;
    width: 12px;
    background-color: var(--tileBgColor);
    border-radius: 3px;
  }
  .firstDay {
    grid-row: var(--startDay);
  }
  span {
    display: flex;
    flex-direction: var(--direction, column);
    justify-self: center;
    align-items: center;
    /* border: 1px solid red; */
  }
  span::before {
    content: "";
    width: var(--width, 0.5px);
    height: var(--height, 4.5px);
    background-color: var(--topThreadColor, inherit);
  }
  span::after {
    content: "";
    width: var(--width, 0.5px);
    height: var(--height, 4.5px);
    background-color: var(--bottomThreadColor, inherit);
  }
</style>
