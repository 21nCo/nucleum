<script lang="ts">
  import Footer from "./Footer.svelte";
  import YearsLayout from "./YearsLayout.svelte";
  import HeaderV2 from "./HeaderV2.svelte";
  import QuadrennialLayout from "./QuadrennialLayout.svelte";
  import DaysLayout from "./DaysLayout.svelte";
  import {
    fetch22years,
    fetch48Years
  } from "$lib/tidy/utils/CalendarHeatMap.utils";
  import { CalendarHeatMapData } from "$lib/tidy/stores/app.store";
  import { CalendarView } from "$lib/tidy/types/CalendarHeatMap.enum";
  import HorizontalCalendarLayout from "./HorizontalCalendarLayout.svelte";
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
      <DaysLayout view="V2" />
    {:else if activeButton == CalendarView.MONTHS}
      <HorizontalCalendarLayout
        let:datum
        {data}
        --times={22}
        --itemSize="44px"
        --columnGap="4px"
      >
        <YearsLayout data={datum} />
      </HorizontalCalendarLayout>
    {:else if activeButton == CalendarView.YEARS}
      <HorizontalCalendarLayout
        let:datum
        {data}
        --times={12}
        --itemSize="85px"
        --columnGap="7px"
      >
        <QuadrennialLayout data={datum} />
      </HorizontalCalendarLayout>
    {/if}</HeaderV2
  >
  <Footer />
</div>

<style>
  .VHM2 {
    width: 1500px;
    height: 279px;
    border-radius: 4px;
    border: 1px solid var(--colors-border-s4, #dbdbdb);
    /* border: 1px solid yellow; */
  }
</style>
