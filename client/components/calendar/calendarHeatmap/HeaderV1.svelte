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
  let logstartdate = "2000-01-01"; //fetch log start date and put here
  let logstartYear = new Date(logstartdate).getFullYear();
  let currentYear = new Date().getFullYear();
  let items: DropdownItem[] = [];

  for (let year = logstartYear; year <= currentYear; year++) {
    items.push({ label: year.toString(), value: year });
  }
  let value: any = items[items.length - 1].value;
  let label: string = "Last 365 days";
  let isLast365: boolean = true;
  // $:console.log("isLast365 ",isLast365);
  function handleSelect(event: any) {
    isLast365 = false;
    const year = event.detail;
    console.log("in handle select e.target.value", year);
    dataManager.fetchDailyDataForTheYear(year);
  }
  async function handleLast365() {
    isLast365 = true;
    console.log("in handle last 365");
    await dataManager.fetchLast12MonthsDailyData();
  }
</script>

<div class="flex flex-row w-full justify-end p-1">
  <span class="w-fit"
    ><DropDown
      on:select={handleSelect}
      {items}
      bind:value
      style={InputStyle.BORDERED}
    /></span
  >
  <Button
    on:click={handleLast365}
    {label}
    type={isLast365 ? "primary" : "secondary"}
  />
</div>
