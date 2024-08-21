<script lang="ts">
  import {
    selectedTimePeriod,
    isTouchDevice
  } from "$lib/client/stores/app.store";
  import {
    CalendarHeatMapData,
    CalendarHeatMapLayout
  } from "./calendarHeatmap.store";
  import {
    TileScale,
    CalendarHmVariant,
    type ICalendarHeatMapDataProvider,
    type CalendarHeatmapOptions
  } from "./calendarHeatmap.types";
  import { CalendarHeatmapDataManager } from "$lib/client/components/calendar/calendarHeatmap/calendarHeatMap.utils";
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
  import { Orientation } from "$lib/client/types/direction.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  export let variant: CalendarHmVariant = CalendarHmVariant.PLAIN;
  export let orientation: Orientation;
  export let touchDevice: boolean;
  export let provider: ICalendarHeatMapDataProvider;
  export let options: CalendarHeatmapOptions = {};
  // export let context: string;
  let heatmapDataManager = new CalendarHeatmapDataManager(provider, options);
  let data: any;
  let isLoading = false;
  const currentYear = new Date().getFullYear();
  const endYear = currentYear;
  export let tileScale: TileScale = TileScale.DAYS;
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
      if (options.selectedYear)
        heatmapDataManager.fetchDailyDataForTheYear(options.selectedYear);
      else await heatmapDataManager.fetchLast12MonthsDailyData();
    } else if (
      tileScale === TileScale.DAYS &&
      variant === CalendarHmVariant.SCALE_SWITCH
    )
      await heatmapDataManager.fetchDailyDataForTheYear(
        new Date().getFullYear()
      );
    else if (tileScale == TileScale.MONTHS) {
      const startYear = currentYear - 21;
      heatmapDataManager.fetchMonthlyAggData(startYear, endYear);
    } else if (tileScale == TileScale.YEARS) {
      const startYear = currentYear - 47;
      heatmapDataManager.fetchYearlyAggData(startYear, endYear);
    }
    refreshSelectedTile();
    isLoading = false;
  }
  async function prev() {
    if (tileScale == TileScale.DAYS)
      await heatmapDataManager.paginateDailyData("prev");
    else if (tileScale == TileScale.MONTHS)
      heatmapDataManager.paginateMonthlyAggData("prev");
    else heatmapDataManager.paginateYearlyAggData("prev");
  }
  async function next() {
    if (tileScale == TileScale.DAYS)
      await heatmapDataManager.paginateDailyData("next");
    else if (tileScale == TileScale.MONTHS)
      heatmapDataManager.paginateMonthlyAggData("next");
    else heatmapDataManager.paginateYearlyAggData("next");
  }
  onMount(async () => {
    await refreshData();
    const hmsub = CalendarHeatMapData.subscribe((x) => {
      data = undefined;
      data = x;
    });
    return () => {
      hmsub();
    };
  });
</script>

<div class="flex h-full w-full flex-col gap-2 items-center">
  {#if variant === CalendarHmVariant.PLAIN}
    <!-- <Icon icon="chevup" on:click={prev} /> -->
  {:else if variant === CalendarHmVariant.YEARS_SWITCH}
    <HeaderV1 {provider} {options} />
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
