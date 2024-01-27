<script lang="ts">
  import { CalendarHeatMapData } from "$lib/tidy/stores/app.store";
  import MonthsLayout from "./MonthsLayout.svelte";
  import HorizontalCalendarLayout from "./HorizontalCalendarLayout.svelte";
  import {
    fetchDailyDataForTheYear,
    fetchLast365daysData
  } from "$lib/tidy/utils/CalendarHeatMap.utils";
  export let view: "V1" | "V2";
  let data: any;
  $: if (view == "V1") fetchLast365daysData();
  else if (view == "V2") fetchDailyDataForTheYear(new Date().getFullYear());
  $: {
    data = $CalendarHeatMapData.data;
    console.log("Data in DaysLayout", data);
  }
</script>

<HorizontalCalendarLayout let:datum {data} isDaysLayout={true}>
  <MonthsLayout {view} data={datum} />
</HorizontalCalendarLayout>
