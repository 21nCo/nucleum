<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import CalendarHeader from "./CalendarHeader.svelte";
  import MonthView from "./MonthView.svelte";
  import CalendarSidebar from "./CalendarSidebar.svelte";
  import WeekView from "./WeekView.svelte";
  import DayView from "./DayView.svelte";
  import YearView from "./YearView.svelte";
  import CalendarLayout from "../CalendarLayout.svelte";
  import view from "$lib/client/stores/view.store";
  import CalendarColumn from "../column/CalendarColumn.svelte";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  export let panel: string = "classic";

  let selectedDate = new Date();
  let selectedView: TimeScaleUnit = TimeScaleUnit.YEAR;
  let events: any[] = [];
  let yearViewRef: YearView;
  let weekViewRef: WeekView;
  let visibleWeekDates: Date[] | undefined;

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

<CalendarLayout bind:panel>
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
        <CalendarColumn scale={TimeScaleUnit.DAY} date={selectedDate} />
      </div>
    {/if}
  </div>
</CalendarLayout>
