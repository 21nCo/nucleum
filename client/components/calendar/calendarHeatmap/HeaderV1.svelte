<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import { InputStyle } from "$lib/client/types/input.type";
  import { CalendarHeatmapDataManager } from "./calendarHeatMap.utils";
  import type {
    ICalendarHeatMapDataProvider,
    CalendarHeatmapOptions
  } from "./calendarHeatmap.types";

  export let provider: ICalendarHeatMapDataProvider;
  export let options: CalendarHeatmapOptions = {};
  let dataManager = new CalendarHeatmapDataManager(provider, options);
  let logstartdate = "2000-01-01";
  let logstartYear = new Date(logstartdate).getFullYear();
  let currentYear = new Date().getFullYear();
  let items: DropdownItem[] = [];

  for (let year = logstartYear; year <= currentYear; year++) {
    items.push({ label: year.toString(), value: year });
  }
  items.push({ label: "Last 365 days", value: 0 });
  items.reverse();
  let value: any = items[0].value;
  async function handleSelect(event: any) {
    const year = event.detail;
    if (year == 0) {
      await dataManager.fetchLast12MonthsDailyData();
    } else {
      await dataManager.fetchDailyDataForTheYear(year);
    }
  }
</script>

<div class="flex gap-2 px-2 w-full justify-end items-center p-1">
  <span class="w-40">
    <DropDown
      on:select={handleSelect}
      {items}
      bind:value
      style={InputStyle.PLAIN}
      isDisableSearch={true}
    />
  </span>
</div>
