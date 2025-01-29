<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import CalendarHeader from "./CalendarHeader.svelte";
  import MonthView from "./MonthView.svelte";
  import CalendarSidebar from "./CalendarSidebar.svelte";
  import WeekView from "./WeekView.svelte";
  import DayView from "./DayView.svelte";
  import YearView from "./YearView.svelte";
  import CalendarLayout from "../CalendarLayout.svelte";

  export let panel: string = "classic";

  let selectedDate = new Date();
  let selectedView: "month" | "week" | "day" | "year" = "year";
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
        if (selectedView === "year") {
          yearViewRef?.scrollToToday();
        } else if (selectedView === "week") {
          weekViewRef?.scrollToToday();
        }
      }}
      on:goToPrevious={() => {
        if (selectedView === "year") {
          yearViewRef?.navigatePrevYear();
        } else if (selectedView === "week") {
          weekViewRef?.scrollToPrevWeek();
        }
      }}
      on:goToNext={() => {
        if (selectedView === "year") {
          yearViewRef?.navigateNextYear();
        } else if (selectedView === "week") {
          weekViewRef?.scrollToNextWeek();
        }
      }}
    />
  </slot>
  <div class="flex h-full">
    <!-- <CalendarSidebar {events} /> -->
    <div class="flex-1 overflow-auto">
      {#if selectedView === "month"}
        <MonthView bind:selectedDate {events} />
      {:else if selectedView === "week"}
        <WeekView
          bind:this={weekViewRef}
          {selectedDate}
          {events}
          on:monthChange={handleMonthChange}
          on:visibleDatesChange={handleVisibleDatesChange}
        />
      {:else if selectedView === "day"}
        <DayView {selectedDate} {events} />
      {:else if selectedView === "year"}
        <YearView
          bind:this={yearViewRef}
          bind:selectedDate
          {events}
          on:yearChange={handleYearChange}
        />
      {/if}
    </div>
  </div>
</CalendarLayout>
