<script lang="ts">
  import { selectedTimePeriod } from "$lib/client/stores/app.store";
  import { Placement, Orientation } from "$lib/client/types/direction.enum";
  import { parseAndFormatDate } from "$lib/client/utils/time.utils";
  import {
    TileAppearance,
    type DailyData,
    type MonthlyData
  } from "./calendarHeatmap.types";
  import { CalendarHeatMapLayout } from "./calendarHeatmap.store";
  import { heatMapColorRange } from "$lib/client/utils/theme.utils";
  import appearance from "$lib/client/stores/appearance.store";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { cn } from "$lib/client/utils/ui.utils";

  export let data: DailyData | MonthlyData;
  export let classList: string = "";
  export let tileValue: string = "";
  tileValue =
    data.display == TileAppearance.FTile || data.display == TileAppearance.LTile
      ? "🔥"
      : tileValue;
  $: colors = heatMapColorRange($appearance, "aps1", 6);
  let tileRef: HTMLSpanElement;
  $: tooltip = resolveToolTip(data.date);
  $: isActive =
    ("date" in data &&
      data.date == parseAndFormatDate($selectedTimePeriod, "iso-short")) ||
    ("month" in data &&
      data.month ==
        parseAndFormatDate($selectedTimePeriod, "iso-short")
          .split("-")
          .slice(0, 2)
          .join("-"));
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
      // tooltip = data.date;
      tileValue = data.date.split("-")[2];
    } else if (
      $CalendarHeatMapLayout == Orientation.Horizontal &&
      "month" in data
    ) {
      let month: number = Number(data.month.split("-")[1]) - 1;
      tileValue = monthTitles[month];
    }
  }
  function resolveToolTip(date: string | undefined) {
    if (!date) return;
    if ("date" in data) {
      return parseAndFormatDate(new Date(date), "verbose");
    }
  }
</script>

<span
  style:--topThreadColor={data.display == TileAppearance.LTile ||
  data.display == TileAppearance.MTile
    ? colors[5]
    : ""}
  style:--bottomThreadColor={data.display === TileAppearance.FTile ||
  data.display === TileAppearance.MTile
    ? colors[5]
    : ""}
  bind:this={tileRef}
  class="relative {classList}"
>
  <HoverableElement
    id="MITile"
    type="button"
    {tooltip}
    tooltipOptions={{
      placement: Placement.Right,
      offsetInPx: 4
    }}
    class={cn("tile text-b5 w-3 h-3 rounded-sm", {
      "border-2 border-bgs1 outline outline-ass1 shadow-outline": isActive
    })}
    style={`background-color: ${colors[data.color]};`}
    on:click={() => {
      //TODO - date.date and date.month to be in Date type approach
      let val;
      if ("date" in data) {
        val = new Date(data.date);
      } else if ("month" in data) {
        val = new Date(data.month + "-01");
      }
      selectedTimePeriod.set(val ?? new Date());
    }}
  >
    <!--on:click dispatch required event along with data/data.day/data.month available here-->
    <!-- {typeof +tileValue == "number" ? "" : tileValue} -->
    <!-- {tileValue} -->
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
  </HoverableElement>
</span>

<style>
  .tile {
    /* color: var(--colors-fg-s2, #545454); */
    font-size: 8px;
    height: 13px;
    width: 13px;
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
  .shadow-outline {
    box-shadow: 0 0 0 2px rgba(var(--colors-fgs3));
  }
</style>
