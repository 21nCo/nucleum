<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import CalendarHeader from "./CalendarHeader.svelte";
  import CalendarGrid from "./CalendarGrid.svelte";
  import CalendarSidebar from "./CalendarSidebar.svelte";
  import WeekView from "./WeekView.svelte";
  import DayView from "./DayView.svelte";
  import YearView from "./YearView.svelte";

  let selectedDate = new Date();
  let selectedView: "month" | "week" | "day" | "year" = "month";
  let events: any[] = [];
  let yearViewRef: YearView;

  function handleYearChange(event: CustomEvent) {
    selectedDate = new Date(
      event.detail.year,
      selectedDate.getMonth(),
      selectedDate.getDate()
    );
  }
</script>

<div class="flex h-full">
  <div class="flex flex-col flex-1 min-w-0">
    <CalendarHeader
      bind:selectedDate
      bind:selectedView
      on:goToToday={() => yearViewRef?.scrollToToday()}
      on:goToPrevious={() => yearViewRef?.navigatePrevYear()}
      on:goToNext={() => yearViewRef?.navigateNextYear()}
    />
    <div class="flex flex-1 min-h-0">
      <!-- <CalendarSidebar {events} /> -->
      <div class="flex-1 overflow-auto">
        {#if selectedView === "month"}
          <CalendarGrid {selectedDate} {events} />
        {:else if selectedView === "week"}
          <WeekView {selectedDate} {events} />
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
  </div>
</div>
