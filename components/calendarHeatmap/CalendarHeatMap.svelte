<script lang="ts">
  import {
    CalendarHeatMapData,
    CalendarHeatMapLayout,
    isTouchDevice
  } from "$lib/tidy/stores/app.store";
  import {
    CalendarHmVariant,
    CalendarView
  } from "$lib/tidy/types/CalendarHeatMap.enum";
  import {
    fetch11years,
    fetch22years,
    fetch24years,
    fetch48Years,
    fetch6months,
    fetchDailyDataForTheYear,
    fetchLast365daysData
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
  export let variant: CalendarHmVariant = CalendarHmVariant.PLAIN;
  export let orientation: Orientation;
  export let touchDevice: boolean;
  let data: any;
  const currentYear = new Date().getFullYear();
  const endYear = currentYear;
  export let scale: CalendarView = CalendarView.DAYS;
  $: {
    $CalendarHeatMapLayout = orientation;
  }
  $: $isTouchDevice = touchDevice;
  function viewChangeHandler(e: any) {
    console.log("viewChangeHandler", e.detail);
    scale = e.detail;
    refreshData();
  }
  function refreshData() {
    if (
      scale === CalendarView.DAYS &&
      variant != CalendarHmVariant.SCALE_SWITCH
    )
      fetchLast365daysData();
    else if (
      scale === CalendarView.DAYS &&
      variant === CalendarHmVariant.SCALE_SWITCH
    )
      fetchDailyDataForTheYear(new Date().getFullYear());
    else if (scale == CalendarView.MONTHS) {
      const startYear = currentYear - 21;
      fetch22years(startYear, endYear);
    } else if (scale == CalendarView.YEARS) {
      const startYear = currentYear - 47;
      fetch48Years(startYear, endYear);
    }
  }
  function prev() {
    if (scale == CalendarView.DAYS) fetch6months("prev");
    else if (scale == CalendarView.MONTHS) fetch11years("prev");
    else fetch24years("prev");
  }
  function next() {
    if (scale == CalendarView.DAYS) fetch6months("next");
    else if (scale == CalendarView.MONTHS) fetch11years("next");
    else fetch24years("next");
  }
  onMount(() => {
    refreshData();
    CalendarHeatMapData.subscribe((x) => {
      data = undefined;
      data = x.data;
    });
  });
</script>

{#if variant === CalendarHmVariant.PLAIN}
  <Icon icon="chevup" on:click={prev} />
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

{#if data}
  {#if orientation === Orientation.Horizontal}
    <HorizontalCalendarLayout let:datum {data} {scale}>
      {#if scale === CalendarView.DAYS}
        <MonthsLayout data={datum} />
      {:else if scale === CalendarView.MONTHS}
        <YearsLayout data={datum} />
      {:else}
        <QuadrennialLayout data={datum} />
      {/if}
    </HorizontalCalendarLayout>
  {:else}
    <VerticalCalendarLayout let:datum {data} {scale}>
      {#if scale === CalendarView.DAYS}
        <MonthsLayout data={datum} />
      {:else if scale === CalendarView.MONTHS}
        <VerticalYearsLayout data={datum} />
      {:else}
        <VerticalQuadrennialLayout data={datum} />
      {/if}
    </VerticalCalendarLayout>
  {/if}
{/if}
<Footer />
{#if variant === CalendarHmVariant.PLAIN}
  <Icon icon="chevdown" on:click={next} />
{/if}
