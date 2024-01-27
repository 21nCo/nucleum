<script lang="ts">
  import Footer from "./Footer.svelte";
  import HeaderV2 from "./HeaderV2.svelte";
  import {
    fetch22years,
    fetch48Years
  } from "$lib/tidy/utils/CalendarHeatMap.utils";
  import { CalendarHeatMapData } from "$lib/tidy/stores/app.store";
  import { CalendarView } from "$lib/tidy/types/CalendarHeatMap.enum";
  import VerticalDaysLayout from "./VerticalDaysLayout.svelte";
  import VerticalCalendarLayout from "./VerticalCalendarLayout.svelte";
  import VerticalYearsLayout from "./VerticalYearsLayout.svelte";
  import VerticalQuadrennialLayout from "./VerticalQuadrennialLayout.svelte";
  let data: any;
  let activeButton: CalendarView = CalendarView.DAYS;
  const currentYear = new Date().getFullYear();
  const endYear = currentYear;
  $: {
    if (activeButton == CalendarView.DAYS) {
    } else if (activeButton == CalendarView.MONTHS) {
      const startYear = currentYear - 21;
      fetch22years(startYear, endYear);
    } else if (activeButton == CalendarView.YEARS) {
      const startYear = currentYear - 47;
      fetch48Years(startYear, endYear);
    }
  }
  $: {
    data = $CalendarHeatMapData.data;
    console.log("Data in HVM2", data);
  }

  function viewChangeHandler(e: any) {
    console.log("viewChangeHandler", e.detail);
    activeButton = e.detail;
  }
</script>

<div class="VHM2">
  <HeaderV2 on:viewChange={viewChangeHandler}>
    {#if activeButton == CalendarView.DAYS}
      <VerticalDaysLayout view="V2" />
    {:else if activeButton == CalendarView.MONTHS}
      <VerticalCalendarLayout
        let:datum
        {data}
        isMonthsLayout={true}
        --times={0}
        --itemSize="300px"
        --columnGap="0px"
        --rowHeight="30px"
      >
        <VerticalYearsLayout data={datum} />
      </VerticalCalendarLayout>
    {:else if activeButton == CalendarView.YEARS}
      <VerticalCalendarLayout
        let:datum
        {data}
        --times={0}
        --itemSize="300px"
        --columnGap="0px"
        --rowHeight="58px"
      >
        <VerticalQuadrennialLayout data={datum} />
      </VerticalCalendarLayout>
    {/if}</HeaderV2
  >
  <Footer />
</div>

<style>
  .VHM2 {
    width: 393px;
    height: 852px;
    padding: 10px;
    border-radius: 4px;
    border: 1px solid var(--colors-border-s4, #dbdbdb);
    /* border: 1px solid yellow; */
  }
</style>
