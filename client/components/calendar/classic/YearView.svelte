<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { compareDates, isSameDay } from "$lib/client/utils/time.utils";
  import CalendarTileIndicator from "./indicator/CalendarTileIndicator.svelte";
  import type { ICalendarIndicatorData } from "../calendar.type";

  export let selectedDate: Date;
  export let indicatorData: ICalendarIndicatorData[] = [];

  const dispatch = createEventDispatcher();

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  const INITIAL_RANGE = 10;
  let years: ReturnType<typeof getYearData>[] = [];
  let visibleYear: number;
  let lastScrollTop = 0;
  let scrollTimeout: ReturnType<typeof setTimeout> | undefined;
  let containerRef: HTMLDivElement;
  let isExplicitNavigation = false;

  function getDaysInMonth(year: number, month: number) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    const totalDays = days.length;
    const remainingDays = 42 - totalDays;
    for (let i = 0; i < remainingDays; i++) {
      days.push(null);
    }

    return days;
  }

  function getYearData(year: number) {
    return {
      year,
      months: Array.from({ length: 12 }, (_, i) => ({
        monthIndex: i,
        days: getDaysInMonth(year, i)
      }))
    };
  }

  function updateSelectedDate(year: number) {
    selectedDate = new Date(
      year,
      selectedDate.getMonth(),
      selectedDate.getDate()
    );
  }

  function loadInitialYears(centerYear: number) {
    const halfRange = Math.floor(INITIAL_RANGE / 2);
    const start = centerYear - halfRange;
    return Array.from({ length: INITIAL_RANGE }, (_, i) =>
      getYearData(start + i)
    ).sort((a, b) => a.year - b.year);
  }

  function loadMoreYears(direction: "up" | "down") {
    const BATCH_SIZE = 5;

    if (direction === "down") {
      const lastYear = years[years.length - 1].year;
      const newYears = Array.from({ length: BATCH_SIZE }, (_, i) =>
        getYearData(lastYear + i + 1)
      );
      years = [...years, ...newYears];
    } else {
      const firstYear = years[0].year;
      const newYears = Array.from({ length: BATCH_SIZE }, (_, i) =>
        getYearData(firstYear - (BATCH_SIZE - i))
      );
      const prevScrollHeight = containerRef?.scrollHeight || 0;
      years = [...newYears, ...years];

      if (containerRef) {
        requestAnimationFrame(() => {
          const newScrollHeight = containerRef.scrollHeight;
          const heightDiff = newScrollHeight - prevScrollHeight;
          containerRef.scrollTop = containerRef.scrollTop + heightDiff;
        });
      }
    }
  }

  function scrollToYear(year: number) {
    if (!containerRef) return;

    const yearIndex = years.findIndex((y) => y.year === year);
    if (yearIndex === -1) {
      const newYears = loadInitialYears(year);
      years = newYears;

      requestAnimationFrame(() => {
        if (!containerRef) return;
        const yearHeight = containerRef.scrollHeight / years.length;
        const centerIndex = Math.floor(INITIAL_RANGE / 2);
        containerRef.scrollTop = yearHeight * centerIndex;
        //TODO - scroll to month if month is not visible in the viewport
      });
      return;
    }

    const yearHeight = containerRef.scrollHeight / years.length;
    const targetScroll = yearHeight * yearIndex;

    containerRef.scrollTo({
      top: targetScroll,
      behavior: "smooth"
    });
  }

  function onScroll(e: Event) {
    const target = e.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    const isScrollingDown = scrollTop > lastScrollTop;
    lastScrollTop = scrollTop;

    const yearHeight = scrollHeight / years.length;
    const currentIndex = Math.floor(
      (scrollTop + clientHeight / 2) / yearHeight
    );
    const newVisibleYear = years[currentIndex]?.year;

    if (newVisibleYear && newVisibleYear !== visibleYear) {
      visibleYear = newVisibleYear;
      selectedDate = new Date(
        newVisibleYear,
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      dispatch("yearChange", { year: newVisibleYear });
    }

    const scrollBuffer = yearHeight * 3;

    if (
      isScrollingDown &&
      scrollHeight - (scrollTop + clientHeight) < scrollBuffer
    ) {
      loadMoreYears("down");
    } else if (!isScrollingDown && scrollTop < scrollBuffer) {
      loadMoreYears("up");
    }
  }

  export function scrollToToday() {
    const today = new Date();
    const targetYear = today.getFullYear();
    navigateToYear(targetYear);
  }

  export function scrollToDate(date: Date) {
    const targetYear = date.getFullYear();
    navigateToYear(targetYear, {
      month: date.getMonth(),
      day: date.getDate()
    });
  }

  export function navigateToYear(
    targetYear: number,
    props?: {
      month?: number;
      day?: number;
    }
  ) {
    if (!years.some((y) => y.year === targetYear)) {
      years = loadInitialYears(targetYear);
    }

    isExplicitNavigation = true;
    selectedDate = new Date(
      targetYear,
      props?.month ?? selectedDate.getMonth(),
      props?.day ?? selectedDate.getDate()
    );
    scrollToYear(targetYear);
    dispatch("yearChange", { year: targetYear });
    isExplicitNavigation = false;
  }

  export function navigatePrevYear() {
    if (!visibleYear) return;
    navigateToYear(visibleYear - 1);
  }

  export function navigateNextYear() {
    if (!visibleYear) return;
    navigateToYear(visibleYear + 1);
  }

  $: {
    if (years.length === 0) {
      const currentYear = selectedDate.getFullYear();
      years = loadInitialYears(currentYear);
      visibleYear = currentYear;
      dispatch("yearChange", { year: currentYear });

      requestAnimationFrame(() => {
        if (!containerRef) return;
        const yearHeight = containerRef.scrollHeight / years.length;
        const centerIndex = Math.floor(INITIAL_RANGE / 2);
        containerRef.scrollTop = yearHeight * centerIndex;
      });
    }
  }

  $: {
    if (containerRef && selectedDate && isExplicitNavigation) {
      scrollToYear(selectedDate.getFullYear());
    }
  }

  function isToday(date: Date | null) {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  function isPastDate(date: Date | null) {
    if (!date) return false;
    const today = new Date();
    return compareDates(date, today, "<");
  }
</script>

<div
  class="h-full overflow-y-auto"
  bind:this={containerRef}
  on:scroll={onScroll}
>
  {#each years as { year, months }}
    <div class="px-6 py-4">
      <div class="mb-4">
        <h2 class="text-h2 font-bold ml-3">{year}</h2>
      </div>
      <div
        class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-16 gap-y-12"
        style="font-family: 'Hanken Grotesk'"
      >
        {#each months as { days, monthIndex }}
          <div class="flex flex-col min-w-[240px]">
            <div class="mb-1 ml-3 font-medium text-fgs1 text-h5">
              {monthNames[monthIndex]}
            </div>
            <div class="grid grid-cols-7 gap-x-1 text-center text-b2">
              {#each weekDays as day}
                <div class="text-fgs4 mb-1 text-b4">{day}</div>
              {/each}
              {#each days as date}
                {#if date}
                  {@const isSelected = isSameDay(selectedDate, date)}
                  {@const isCurrentDay = isToday(date)}
                  {@const isPastDay = isPastDate(date)}
                  <button
                    class={cn(
                      "py-1 rounded-md border flex flex-col items-center justify-center h-9 max-w-9",
                      {
                        "bg-aps1 text-abg border-transparent": isSelected,
                        "text-ass1 font-medium border-ass1 notouch:hover:bg-ass2 active:bg-ass2":
                          isCurrentDay && !isSelected
                      },
                      !isSelected &&
                        !isCurrentDay && {
                          "hover:text-fgs1 border-transparent notouch:hover:bg-bgs2 active:bg-bgs2": true,
                          "text-fgs2 border-transparent": isPastDay,
                          "text-fgs3": !isPastDay
                        }
                    )}
                    on:click={() => {
                      selectedDate = date;
                      dispatch("dateChange", { date });
                    }}
                  >
                    {date.getDate()}
                    {#if indicatorData.length > 0}
                      <CalendarTileIndicator
                        {date}
                        data={indicatorData}
                        isActive={isSelected}
                        view="year"
                      />
                    {/if}
                  </button>
                {:else}
                  <div class="py-0.5 text-fgs4"></div>
                {/if}
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>
