<script lang="ts">
  import {
    CalendarHeatMapData,
    CalendarHeatMapLayout,
    calendarHmContext,
    selectedTimePeriod,
    isTouchDevice
  } from "$lib/tidy/stores/app.store";
  import {
    CalendarHmVariant,
    TileScale
  } from "$lib/tidy/types/CalendarHeatMap.enum";
  import {
    paginateMonthlyAggData,
    fetchMonthlyAggData,
    paginateYearlyAggData,
    fetchYearlyAggData,
    paginateDailyData,
    fetchDailyDataForTheYear,
    fetchLast12MonthsDailyData
  } from "$lib/tidy/utils/CalendarHeatMap.utils";
  import { onMount } from "svelte";
  import Footer from "./Footer.svelte";
  import HeaderV1 from "./HeaderV1.svelte";
  import HeaderV2 from "./HeaderV2.svelte";
  import HorizontalCalendarLayout from "./HorizontalCalendarLayout.svelte";
  import MonthsLayout from "./MonthsLayout.svelte";
  import QuadrennialLayout from "./QuadrennialLayout.svelte";
  import VerticalCalendarLayout from "./VerticalCalendarLayout.svelte";
  import VerticalQuadrennialLayout from "./VerticalQuadrennialLayout.svelte";
  import VerticalYearsLayout from "./VerticalYearsLayout.svelte";
  import YearsLayout from "./YearsLayout.svelte";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import EmptyStatusView from "$lib/tidy/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  export let variant: CalendarHmVariant = CalendarHmVariant.PLAIN;
  export let orientation: Orientation;
  export let touchDevice: boolean;
  export let context: string;
  let data: any;
  let isLoading = false;
  const currentYear = new Date().getFullYear();
  const endYear = currentYear;
  export let tileScale: TileScale = TileScale.DAYS;
  calendarHmContext.set(context);
  $: {
    $CalendarHeatMapLayout = orientation;
  }
  $: $isTouchDevice = touchDevice;
  function viewChangeHandler(e: any) {
    console.log("viewChangeHandler", e.detail);
    tileScale = e.detail;
    refreshData();
  }
  function refreshSelectedTile() {
    if (tileScale === TileScale.DAYS) {
      selectedTimePeriod.set(new Date());
    }
  }
  async function refreshData() {
    data = undefined;
    isLoading = true;
    if (
      tileScale === TileScale.DAYS &&
      variant != CalendarHmVariant.SCALE_SWITCH
    ) {
      await fetchLast12MonthsDailyData();
    } else if (
      tileScale === TileScale.DAYS &&
      variant === CalendarHmVariant.SCALE_SWITCH
    )
      await fetchDailyDataForTheYear(new Date().getFullYear());
    else if (tileScale == TileScale.MONTHS) {
      const startYear = currentYear - 21;
      fetchMonthlyAggData(startYear, endYear);
    } else if (tileScale == TileScale.YEARS) {
      const startYear = currentYear - 47;
      fetchYearlyAggData(startYear, endYear);
    }
    refreshSelectedTile();
    isLoading = false;
  }
  async function prev() {
    if (tileScale == TileScale.DAYS) await paginateDailyData("prev");
    else if (tileScale == TileScale.MONTHS) paginateMonthlyAggData("prev");
    else paginateYearlyAggData("prev");
  }
  async function next() {
    if (tileScale == TileScale.DAYS) await paginateDailyData("next");
    else if (tileScale == TileScale.MONTHS) paginateMonthlyAggData("next");
    else paginateYearlyAggData("next");
  }
  onMount(async () => {
    await refreshData();
    const hmsub = CalendarHeatMapData.subscribe((x) => {
      data = undefined;
      data = x.data;
    });
    const hmselection = selectedTimePeriod.subscribe((x) => {
      console.log("selectedTimePeriod", x);
    });
    return () => {
      hmsub();
      hmselection();
    };
  });
</script>

<div class="flex h-full w-full flex-col gap-2 items-center">
  {#if variant === CalendarHmVariant.PLAIN}
    <!-- <Icon icon="chevup" on:click={prev} /> -->
  {:else if variant === CalendarHmVariant.YEARS_SWITCH}
    <HeaderV1 />
  {:else if variant === CalendarHmVariant.SCALE_SWITCH}
    <HeaderV2
      on:switch={viewChangeHandler}
      {orientation}
      on:prev={prev}
      on:next={next}
    />
  {/if}
  <div class="h-full w-full">
    {#if isLoading}
      <EmptyStatusView
        size={Size.sm}
        isLoadingState={isLoading}
        mainText=""
        loadingText=""
      />
    {:else if data}
      {#if orientation === Orientation.Horizontal}
        <HorizontalCalendarLayout let:datum {data} scale={tileScale}>
          {#if tileScale === TileScale.DAYS}
            <MonthsLayout data={datum} />
          {:else if tileScale === TileScale.MONTHS}
            <YearsLayout data={datum} />
          {:else}
            <QuadrennialLayout data={datum} />
          {/if}
        </HorizontalCalendarLayout>
      {:else}
        <VerticalCalendarLayout let:datum {data} scale={tileScale}>
          {#if tileScale === TileScale.DAYS}
            <MonthsLayout data={datum} />
          {:else if tileScale === TileScale.MONTHS}
            <VerticalYearsLayout data={datum} />
          {:else}
            <VerticalQuadrennialLayout data={datum} />
          {/if}
        </VerticalCalendarLayout>
      {/if}
    {/if}
  </div>
  {#if variant === CalendarHmVariant.PLAIN}
    <!-- <Icon icon="chevdown" on:click={next} /> -->
  {:else}
    <Footer />
  {/if}
</div>
