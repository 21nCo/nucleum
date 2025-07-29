<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import {
    CalendarTileIndicatorDisplayType,
    type ICalendarIndicatorData
  } from "../calendar.type";
  import CalendarTileIndicator from "./indicator/CalendarTileIndicator.svelte";
  import { resizeListener } from "$lib/client/actions/resize.action";

  export let selectedDate: Date;
  export let indicatorData: ICalendarIndicatorData[] = [];
  export let indicatorRefreshId: number = 0;

  const dispatch = createEventDispatcher();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let isScrolling = false;
  let scrollTimeout: NodeJS.Timeout;
  let containerWidth: number = 0;
  let today = new Date();

  $: isConstrainedWidth = containerWidth < 600;
  function handleWheel(event: WheelEvent) {
    if (isScrolling) return;

    isScrolling = true;
    clearTimeout(scrollTimeout);

    const delta = event.deltaY;
    const newDate = new Date(selectedDate);

    if (delta > 0) {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }

    selectedDate = newDate;
    dispatch("monthChange", newDate);

    scrollTimeout = setTimeout(() => {
      isScrolling = false;
    }, 150);
  }

  function getDaysInMonth(date: Date): Date[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysFromPrevMonth = firstDay.getDay();
    const prevMonthDays = [...Array(daysFromPrevMonth)].map((_, i) => {
      return new Date(year, month, -daysFromPrevMonth + i + 1);
    });

    const daysInMonth = [...Array(lastDay.getDate())].map((_, i) => {
      return new Date(year, month, i + 1);
    });

    const remainingDays =
      (7 - ((daysFromPrevMonth + daysInMonth.length) % 7)) % 7;
    const nextMonthDays = [...Array(remainingDays)].map((_, i) => {
      return new Date(year, month + 1, i + 1);
    });

    return [...prevMonthDays, ...daysInMonth, ...nextMonthDays];
  }

  $: calendarDays = getDaysInMonth(selectedDate);
</script>

<div
  class="flex-1 overflow-auto h-full"
  on:wheel={handleWheel}
  use:resizeListener={(e) => {
    containerWidth = e.width;
  }}
>
  <div class="grid grid-cols-7 h-full grid-rows-[auto_1fr_1fr_1fr_1fr_1fr_1fr]">
    {#each weekDays as day}
      <div
        class="p-2 text-b3 text-fgs3 text-center border-b border-r border-brs3"
      >
        {day}
      </div>
    {/each}

    {#each calendarDays as day}
      {@const isToday = day.toDateString() === today.toDateString()}
      {@const isSelected = day.toDateString() === selectedDate.toDateString()}
      {@const isNotCurrentMonth = day.getMonth() !== selectedDate.getMonth()}
      <button
        class={cn(
          "p-2 border-b border-r border-brs3 relative group flex flex-col items-start",
          {
            "bg-bgs2/50": isNotCurrentMonth,
            "notouch:hover:bg-bgs2": !isToday && !isSelected,
            "bg-ass3 text-ass1 notouch:hover:bg-ass2/10":
              isToday && !isSelected,
            "bg-aps3 text-aps1": isSelected
          }
        )}
        on:click={() => {
          selectedDate = day;
          dispatch("dateChange", day);
        }}
      >
        <span class="flex items-center justify-center">
          <span
            class={cn(
              "text-b2 text-left w-7 h-7 rounded-full flex items-center justify-center default-typeface",
              {
                "text-fgs3": isNotCurrentMonth,
                "bg-aps1 text-abg": isSelected,
                "bg-ass1 text-abg": isToday && !isSelected
              }
            )}
          >
            {day.getDate()}
          </span>
          {#if isToday && !isConstrainedWidth}
            <span class="text-b3 p-1"> Today </span>
          {/if}
        </span>
        {#if indicatorData.length > 0}
          <div class="pl-1 pt-1 w-full">
            <CalendarTileIndicator
              date={day}
              isActive={isSelected}
              data={indicatorData}
              {indicatorRefreshId}
              type={isConstrainedWidth
                ? CalendarTileIndicatorDisplayType.DOTS
                : CalendarTileIndicatorDisplayType.METRICS}
            />
          </div>
        {/if}
      </button>
    {/each}
  </div>
</div>
<svelte:window
  on:focus={() => {
    today = new Date();
  }}
/>
