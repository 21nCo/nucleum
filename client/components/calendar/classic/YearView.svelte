<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";

  export let selectedDate: Date;
  export let events: Array<any> = [];

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

  const INITIAL_RANGE = 10; // Initial number of years to show
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

    // Add empty days for padding
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add empty days at the end to complete the grid
    const totalDays = days.length;
    const remainingDays = 42 - totalDays; // 6 rows * 7 days = 42
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
    ).sort((a, b) => a.year - b.year); // Ensure years are in order
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

      // Maintain scroll position after prepending years
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

    // Find the index of the year
    const yearIndex = years.findIndex((y) => y.year === year);
    if (yearIndex === -1) {
      // If year not loaded, load it and center it
      const newYears = loadInitialYears(year);
      years = newYears;

      // Wait for DOM update then scroll
      requestAnimationFrame(() => {
        if (!containerRef) return;
        const yearHeight = containerRef.scrollHeight / years.length;
        const centerIndex = Math.floor(INITIAL_RANGE / 2);
        containerRef.scrollTop = yearHeight * centerIndex;
      });
      return;
    }

    // Calculate exact position of the year
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

    // Clear any pending scroll timeouts
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    // Determine scroll direction
    const isScrollingDown = scrollTop > lastScrollTop;
    lastScrollTop = scrollTop;

    // Calculate current visible year without snapping
    const yearHeight = scrollHeight / years.length;
    const currentIndex = Math.floor(
      (scrollTop + clientHeight / 2) / yearHeight
    );
    const newVisibleYear = years[currentIndex]?.year;

    if (newVisibleYear && newVisibleYear !== visibleYear) {
      visibleYear = newVisibleYear;
      // Update selected date without scrolling
      selectedDate = new Date(
        newVisibleYear,
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      // Dispatch year change event
      dispatch("yearChange", { year: newVisibleYear });
    }

    // Load more years when approaching edges with larger buffer
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

  // Navigation methods
  export function scrollToToday() {
    const today = new Date();
    const targetYear = today.getFullYear();
    navigateToYear(targetYear);
  }

  export function navigateToYear(targetYear: number) {
    // Load the year if it's not in view
    if (!years.some((y) => y.year === targetYear)) {
      years = loadInitialYears(targetYear);
    }

    isExplicitNavigation = true;
    selectedDate = new Date(
      targetYear,
      selectedDate.getMonth(),
      selectedDate.getDate()
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

  // Initialize years array
  $: {
    if (years.length === 0) {
      const currentYear = selectedDate.getFullYear();
      years = loadInitialYears(currentYear);
      visibleYear = currentYear;
      dispatch("yearChange", { year: currentYear });

      // Initial scroll without animation
      requestAnimationFrame(() => {
        if (!containerRef) return;
        const yearHeight = containerRef.scrollHeight / years.length;
        const centerIndex = Math.floor(INITIAL_RANGE / 2);
        containerRef.scrollTop = yearHeight * centerIndex;
      });
    }
  }

  // Only watch for selectedDate changes when explicitly navigating
  $: {
    if (containerRef && selectedDate && isExplicitNavigation) {
      scrollToYear(selectedDate.getFullYear());
    }
  }

  $: isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };
</script>

<div
  class="h-full overflow-y-auto"
  bind:this={containerRef}
  on:scroll={onScroll}
>
  {#each years as { year, months }}
    <div class="px-6 py-4">
      <div class="mb-4">
        <h2 class="text-xl font-medium">{year}</h2>
      </div>
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lp:grid-cols-3 dp:grid-cols-4 2k:grid-cols-5 gap-x-6 gap-y-4"
      >
        {#each months as { days, monthIndex }}
          <div class="flex flex-col min-w-[240px]">
            <div class="mb-1 font-medium text-fgs1">
              {monthNames[monthIndex]}
            </div>
            <div class="grid grid-cols-7 text-center text-sm">
              {#each weekDays as day}
                <div class="text-fgs3 mb-1">{day}</div>
              {/each}
              {#each days as date}
                {#if date}
                  <div
                    class={cn(
                      "py-0.5",
                      isToday(date) && "text-aps1 font-medium",
                      !isToday(date) && "text-fgs2 hover:text-fgs1"
                    )}
                  >
                    {date.getDate()}
                  </div>
                {:else}
                  <div class="py-0.5 text-fgs4">
                    <!-- empty cell -->
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>
