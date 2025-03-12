<script lang="ts">
  import CalendarHeader from "./CalendarHeader.svelte";
  import MonthView from "./MonthView.svelte";
  import WeekView from "./WeekView.svelte";
  import DayView from "./DayView.svelte";
  import YearView from "./YearView.svelte";
  import CalendarLayoutView from "../CalendarLayout.svelte";
  import view from "$lib/client/stores/view.store";
  import CalendarColumn from "../column/CalendarColumn.svelte";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { CalendarLayout } from "../calendar.type";
  export let panel: CalendarLayout = CalendarLayout.Classic;

  let selectedDate = new Date();
  let selectedView: TimeScaleUnit = resolveSavedScaleSelection();
  let events: any[] = [];
  let yearViewRef: YearView;
  let weekViewRef: WeekView;
  let visibleWeekDates: Date[] | undefined;

  function resolveSavedScaleSelection() {
    const scaleState = uiState.getState(UIState.calendarScale, {
      isDeviceScoped: true
    });
    return scaleState ?? TimeScaleUnit.YEAR;
  }

  function handleYearChange(event: CustomEvent) {
    selectedDate = new Date(
      event.detail.year,
      selectedDate.getMonth(),
      selectedDate.getDate()
    );
  }

  function handleMonthChange(event: CustomEvent) {
    selectedDate = event.detail;
  }

  function handleVisibleDatesChange(event: CustomEvent) {
    visibleWeekDates = event.detail.dates;
  }
</script>

<CalendarLayoutView bind:panel>
  <slot name="header" slot="header">
    <CalendarHeader
      bind:selectedDate
      bind:selectedView
      {visibleWeekDates}
      on:goToToday={() => {
        if (selectedView === TimeScaleUnit.YEAR) {
          yearViewRef?.scrollToToday();
        } else if (selectedView === TimeScaleUnit.WEEK) {
          weekViewRef?.scrollToToday();
        }
      }}
      on:goToPrevious={() => {
        if (selectedView === TimeScaleUnit.YEAR) {
          yearViewRef?.navigatePrevYear();
        } else if (selectedView === TimeScaleUnit.WEEK) {
          weekViewRef?.scrollToPrevWeek();
        }
      }}
      on:goToNext={() => {
        if (selectedView === TimeScaleUnit.YEAR) {
          yearViewRef?.navigateNextYear();
        } else if (selectedView === TimeScaleUnit.WEEK) {
          weekViewRef?.scrollToNextWeek();
        }
      }}
    />
  </slot>
  <div class="flex h-full">
    <!-- <CalendarSidebar {events} /> -->
    <div class="flex-1 overflow-auto">
      {#if selectedView === TimeScaleUnit.MONTH}
        <MonthView bind:selectedDate {events} on:dateSelect />
      {:else if selectedView === TimeScaleUnit.WEEK}
        <WeekView
          bind:this={weekViewRef}
          {selectedDate}
          {events}
          on:monthChange={handleMonthChange}
          on:visibleDatesChange={handleVisibleDatesChange}
        />
      {:else if selectedView === TimeScaleUnit.DAY}
        <DayView {selectedDate} {events} />
      {:else if selectedView === TimeScaleUnit.YEAR}
        <YearView
          bind:this={yearViewRef}
          bind:selectedDate
          {events}
          on:yearChange={handleYearChange}
          on:dateSelect
        />
      {/if}
    </div>
    {#if !$view.isConstrainedWidth}
      <div class="w-96 p-3 border-l border-brs3">
        {#key selectedDate}
          <CalendarColumn scale={TimeScaleUnit.DAY} date={selectedDate} />
        {/key}
      </div>
    {/if}
  </div>
</CalendarLayoutView>
