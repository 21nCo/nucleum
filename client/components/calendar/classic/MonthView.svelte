<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";

  export let selectedDate: Date;
  export let events: any[] = [];

  const dispatch = createEventDispatcher();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let isScrolling = false;
  let scrollTimeout: NodeJS.Timeout;

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

    // Get days from previous month to fill the first week
    const daysFromPrevMonth = firstDay.getDay();
    const prevMonthDays = [...Array(daysFromPrevMonth)].map((_, i) => {
      return new Date(year, month, -daysFromPrevMonth + i + 1);
    });

    // Get all days in current month
    const daysInMonth = [...Array(lastDay.getDate())].map((_, i) => {
      return new Date(year, month, i + 1);
    });

    // Get days from next month to complete the last week
    const remainingDays =
      (7 - ((daysFromPrevMonth + daysInMonth.length) % 7)) % 7;
    const nextMonthDays = [...Array(remainingDays)].map((_, i) => {
      return new Date(year, month + 1, i + 1);
    });

    return [...prevMonthDays, ...daysInMonth, ...nextMonthDays];
  }

  $: calendarDays = getDaysInMonth(selectedDate);
  $: today = new Date();
</script>

<div class="flex-1 overflow-auto h-full" on:wheel={handleWheel}>
  <div class="grid grid-cols-7 h-full grid-rows-[auto_1fr_1fr_1fr_1fr_1fr_1fr]">
    {#each weekDays as day}
      <div
        class="p-2 text-b3 text-fgs3 text-center border-b border-r border-brs3"
      >
        {day}
      </div>
    {/each}

    {#each calendarDays as day}
      <div
        class={cn("p-2 border-b border-r border-brs3 relative group", {
          "bg-bgs2": day.getMonth() !== selectedDate.getMonth(),
          "bg-aps3": day.toDateString() === today.toDateString()
        })}
      >
        <span
          class={cn("text-b3", {
            "text-fgs3": day.getMonth() !== selectedDate.getMonth(),
            "text-aps1": day.toDateString() === today.toDateString()
          })}
        >
          {day.getDate()}
        </span>

        <!-- Events would go here -->
        <div class="mt-1 space-y-1">
          {#each events.filter((event) => event.date.toDateString() === day.toDateString()) as event}
            <div class="text-b4 p-1 rounded bg-aps3 text-aps1">
              {event.title}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
