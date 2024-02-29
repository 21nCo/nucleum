<script lang="ts">
  import {
    CalendarHeatMapLayout,
    selectedTimePeriod
  } from "$lib/tidy/stores/app.store";
  import type {
    DailyData,
    MonthlyData
  } from "$lib/tidy/types/CalendarHeatMapData.type";
  import { Direction, Orientation } from "$lib/tidy/types/direction.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import { formatDate } from "$lib/tidy/utils/time.utils";
  import { renderPopoverv2 } from "$lib/tidy/utils/ui.utils";

  export let data: DailyData | MonthlyData | {};
  export let classList: string = "";
  export let tileValue: string = "";
  let tileRef: HTMLSpanElement;
  let toolTipRef: HTMLDivElement;
  let isHovering: boolean = false;
  let tooltip: string | undefined = undefined;
  $: isActive =
    ("date" in data &&
      data.date == formatDate($selectedTimePeriod, "iso-short")) ||
    ("month" in data &&
      data.month ==
        formatDate($selectedTimePeriod, "iso-short")
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
  function resolveToolTip() {
    if ("date" in data) {
      tooltip = formatDate(new Date(data.date), "verbose");
    }
  }
  function hideToolTip() {
    if (toolTipRef && toolTipRef?.style?.display != "none")
      toolTipRef.style.display = "none";
  }
</script>

<span
  bind:this={tileRef}
  class="relative {classList}"
  on:pointerenter={() => {
    isHovering = true;
    resolveToolTip();
    setTimeout(() => {
      if (tooltip && toolTipRef) {
        renderPopoverv2(tileRef, toolTipRef, Direction.Right);
      }
    }, 100);
  }}
  on:pointerleave={() => {
    isHovering = false;
    tooltip = undefined;
    hideToolTip();
  }}
>
  <button
    id="MITile"
    class={isActive ? "border-2 border-bgs1 shadow-outline" : ""}
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
    <!-- dispatch required event on:click here-->
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
  </button>
  {#if tooltip}
    <div
      bind:this={toolTipRef}
      class="min-w-fit bg-fgs3 text-bgs1 text-b4 rounded-sm z-30 ml-1 px-2"
      style="display: none;"
    >
      {tooltip}
    </div>
  {/if}
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
