<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import DropDown from "$lib/tidy/elements/dropdown/DropDown.svelte";
  import {
    DropDownStyle,
    type DropdownItem
  } from "$lib/tidy/types/dropdownItem.type";
  import { DataManager } from "./calendarHeatMap.utils";
  import type { CalendarHeatMapDataProvider } from "./calendarHeatmap.types";

  export let provider: CalendarHeatMapDataProvider;
  let dataManager = new DataManager(provider);
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
  function handleLast365() {
    isLast365 = true;
    console.log("in handle last 365");
    dataManager.fetchLast12MonthsDailyData();
  }
</script>

<div class="flex flex-row w-full justify-end p-1">
  <span class="w-fit"
    ><DropDown
      on:select={handleSelect}
      isActive={!isLast365 ? true : false}
      {items}
      {value}
      style={DropDownStyle.OUTLINED}
    /></span
  >
  <Button
    on:click={handleLast365}
    {label}
    type={isLast365 ? "primary" : "secondary"}
  />
</div>
