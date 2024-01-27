<script lang="ts">
  import { CalendarHeatMapData } from "$lib/tidy/stores/app.store";
  import MonthsLayout from "./MonthsLayout.svelte";
  import {
    fetchDailyDataForTheYear,
    fetchLast365daysData
  } from "$lib/tidy/utils/CalendarHeatMap.utils";
  import VerticalCalendarLayout from "./VerticalCalendarLayout.svelte";
  export let view: "V1" | "V2";
  let data: any;
  $: if (view == "V1") fetchLast365daysData();
  else if (view == "V2") fetchDailyDataForTheYear(new Date().getFullYear());
  $: {
    data = $CalendarHeatMapData.data;
    console.log("Data in DaysLayout", data);
  }
</script>

<VerticalCalendarLayout let:datum {data} isDaysLayout={true} --columnGap="2px">
  <MonthsLayout data={datum} {view} />
</VerticalCalendarLayout>
