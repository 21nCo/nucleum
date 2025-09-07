<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy, tick } from "svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { compareDates, isSameDay } from "$lib/client/utils/time.utils";
  import CalendarTileIndicator from "./indicator/CalendarTileIndicator.svelte";
  import type { ICalendarIndicatorData } from "../calendar.type";
  import { preferences } from "$lib/client/stores/preferences/preferences.store";
  import { Preference } from "$lib/client/stores/preferences/preferences.type";
  import { TimeScaleUnit } from "$lib/client/types/time.type";

  export let selectedDate: Date;
  export let indicatorData: ICalendarIndicatorData[] = [];
  export let indicatorRefreshId: number = 0;
  export let selectedScale: TimeScaleUnit = TimeScaleUnit.DAY;

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

  const YEAR_RANGE = 200;
  const BASE_YEAR = new Date().getFullYear() - 100;
  let YEAR_HEIGHT = 1200;
  $: VIRTUAL_HEIGHT = YEAR_RANGE * YEAR_HEIGHT;

  const getVisibleYears = () => {
    if (typeof window === "undefined") return 3;
    const width = window.innerWidth;
    if (width >= 1920) return 5;
    return 3;
  };

  const VISIBLE_YEARS = getVisibleYears();

  let visibleYears: ReturnType<typeof getYearData>[] = [];
  let visibleYear: number = selectedDate.getFullYear();
  let lastScrollTop = 0;
  let scrollTimeout: ReturnType<typeof setTimeout> | undefined;
  let containerRef: HTMLDivElement;
  let isExplicitNavigation = false;
  let virtualScrollTop = 0;
  let startYearIndex = 0;
  let isMounted = false;

  let showYearIndicators =
    preferences.resolve(Preference.CALENDAR_TILE_INDICATORS_YEAR) ?? true;

  const unsubscribe = preferences.subscribe((prefs) => {
    showYearIndicators =
      prefs[Preference.CALENDAR_TILE_INDICATORS_YEAR] ?? true;
  });

  onDestroy(unsubscribe);
  onMount(() => {
    updateVisibleYears();
    requestAnimationFrame(() => {
      const yearElement = document.querySelector(
        '[id^="year-"]'
      ) as HTMLElement;
      if (yearElement) {
        const actualHeight = yearElement.offsetHeight;
        if (actualHeight > 0) {
          YEAR_HEIGHT = actualHeight;
          const currentYear = selectedDate.getFullYear();
          virtualScrollTop = getVirtualPosition(currentYear);
          updateVisibleYears();
          containerRef.scrollTop = virtualScrollTop;
        }
      }
    });

    let timeoutId: ReturnType<typeof setTimeout>;
    timeoutId = setTimeout(() => {
      scrollToYear(selectedDate.getFullYear(), selectedDate.getMonth());
      tick().then(() => {
        isMounted = true;
      });
    }, 500);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  });

  function getYearFromIndex(index: number): number {
    return BASE_YEAR + index;
  }

  function getIndexFromYear(year: number): number {
    return year - BASE_YEAR;
  }

  function updateVisibleYears() {
    const centerIndex = Math.floor(virtualScrollTop / YEAR_HEIGHT);
    startYearIndex = Math.max(0, centerIndex - Math.floor(VISIBLE_YEARS / 2));

    const maxStartIndex = Math.max(0, YEAR_RANGE - VISIBLE_YEARS);
    startYearIndex = Math.min(startYearIndex, maxStartIndex);

    visibleYears = Array.from({ length: VISIBLE_YEARS }, (_, i) => {
      const yearIndex = startYearIndex + i;
      const year = getYearFromIndex(yearIndex);
      return getYearData(year);
    });
  }

  function getVirtualPosition(year: number): number {
    const index = getIndexFromYear(year);
    return index * YEAR_HEIGHT;
  }

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

  function createSafeDate(year: number, month: number, day: number): Date {
    // Get the last day of the target month to clamp the day
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(day, lastDayOfMonth);
    return new Date(year, month, clampedDay);
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

  function scrollToYear(year: number, month?: number) {
    if (!containerRef) return;

    const targetPosition = getVirtualPosition(year);
    virtualScrollTop = targetPosition;
    updateVisibleYears();

    containerRef.scrollTop = targetPosition;

    requestAnimationFrame(() => {
      const isScrollToYear =
        containerRef?.clientWidth > 1200 || month === undefined;
      const targetId = isScrollToYear
        ? `year-${year}`
        : `month-${year}-${month}`;
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: isScrollToYear ? "start" : "center"
        });
      }
    });
  }

  function onScroll(e: Event) {
    if (!isMounted) return;
    const target = e.target as HTMLElement;
    const { scrollTop } = target;

    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    virtualScrollTop = scrollTop;
    const isScrollingDown = scrollTop > lastScrollTop;
    lastScrollTop = scrollTop;

    const currentMonth = selectedDate.getMonth();
    const currentDay = selectedDate.getDate();
    const currentYear = selectedDate.getFullYear();

    const targetYear = isScrollingDown ? currentYear + 1 : currentYear - 1;

    const targetDate = createSafeDate(targetYear, currentMonth, currentDay);
    const dateButtons = Array.from(
      containerRef.querySelectorAll("button")
    ).filter((btn) => {
      const btnText = btn.textContent?.trim();
      if (btnText === currentDay.toString()) {
        const monthContainer = btn.closest('[id^="month-"]');
        return monthContainer?.id === `month-${targetYear}-${currentMonth}`;
      }
      return false;
    });

    if (dateButtons.length > 0) {
      const containerRect = containerRef.getBoundingClientRect();
      const dateButton = dateButtons[0];
      const buttonRect = dateButton.getBoundingClientRect();
      const isDateVisible =
        buttonRect.top >= containerRect.top &&
        buttonRect.bottom <= containerRect.bottom;

      if (isDateVisible && targetYear !== visibleYear) {
        visibleYear = targetYear;
        selectedDate = createSafeDate(targetYear, currentMonth, currentDay);
        dispatch("yearChange", { year: targetYear });
      }
    }

    scrollTimeout = setTimeout(() => {
      updateVisibleYears();
    }, 16);
  }

  export function scrollToToday() {
    const today = new Date();
    const targetYear = today.getFullYear();
    navigateToYear(targetYear, {
      month: today.getMonth(),
      day: today.getDate()
    });
  }

  export function scrollToDate(date: Date) {
    const targetYear = date.getFullYear();

    if (targetYear < BASE_YEAR || targetYear >= BASE_YEAR + YEAR_RANGE) {
      console.warn(
        `Year ${targetYear} is outside the supported range (${BASE_YEAR} - ${BASE_YEAR + YEAR_RANGE - 1})`
      );
      return;
    }

    const targetPosition = getVirtualPosition(targetYear);
    virtualScrollTop = targetPosition;
    updateVisibleYears();

    containerRef.scrollTop = targetPosition;

    requestAnimationFrame(() => {
      navigateToYear(targetYear, {
        month: date.getMonth(),
        day: date.getDate()
      });
    });
  }

  export function navigateToYear(
    targetYear: number,
    props?: {
      month?: number;
      day?: number;
    }
  ) {
    isExplicitNavigation = true;
    selectedDate = createSafeDate(
      targetYear,
      props?.month ?? selectedDate.getMonth(),
      props?.day ?? selectedDate.getDate()
    );
    scrollToYear(targetYear, selectedDate.getMonth());
    dispatch("yearChange", { year: targetYear });
    isExplicitNavigation = false;
  }

  export function navigatePrevYear() {
    const currentYear = visibleYear || selectedDate.getFullYear();
    const targetYear = currentYear - 1;
    visibleYear = targetYear;
    navigateToYear(targetYear);
  }

  export function navigateNextYear() {
    const currentYear = visibleYear || selectedDate.getFullYear();
    const targetYear = currentYear + 1;
    visibleYear = targetYear;
    navigateToYear(targetYear);
  }

  $: {
    if (visibleYears.length === 0) {
      const currentYear = selectedDate.getFullYear();
      virtualScrollTop = getVirtualPosition(currentYear);
      updateVisibleYears();
      visibleYear = currentYear;
      dispatch("yearChange", { year: currentYear });
    }
  }

  $: {
    if (containerRef && selectedDate && isExplicitNavigation) {
      scrollToYear(selectedDate.getFullYear(), selectedDate.getMonth());
    }
  }

  $: {
    if (selectedDate) {
      visibleYear = selectedDate.getFullYear();
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

  function resolveIfFutureMonth(year: number, monthIndex: number) {
    const today = new Date();
    return (
      year > today.getFullYear() ||
      (monthIndex > today.getMonth() && year === today.getFullYear())
    );
  }
  function resolveIfCurrentMonth(year: number, monthIndex: number) {
    const today = new Date();
    return year === today.getFullYear() && monthIndex === today.getMonth();
  }

  function handleMonthSelect(year: number, monthIndex: number) {
    const monthDate = new Date(year, monthIndex, 1);
    dispatch("monthSelect", { date: monthDate });
  }

  function handleYearSelect(year: number) {
    const yearDate = new Date(year, 0, 1);
    dispatch("yearSelect", { date: yearDate });
  }
</script>

<div
  class="h-full overflow-y-auto"
  bind:this={containerRef}
  on:scroll={onScroll}
>
  <div style="height: {VIRTUAL_HEIGHT}px; position: relative;">
    <div
      style="position: absolute; top: {startYearIndex *
        YEAR_HEIGHT}px; width: 100%;"
    >
      {#each visibleYears as { year, months }}
        {@const isFutureYear = year > new Date().getFullYear()}
        {@const isSelectedYear =
          selectedScale === TimeScaleUnit.YEAR &&
          selectedDate.getFullYear() === year}
        <div class="px-6 py-3" id="year-{year}">
          <div class="mb-2">
            <button
              class={cn(
                "text-h2 font-medium ml-3 hover:text-aps1 transition-colors cursor-pointer",
                {
                  "text-fgs4": isFutureYear && !isSelectedYear,
                  "text-aps1 font-bold": isSelectedYear
                }
              )}
              on:click={() => handleYearSelect(year)}
            >
              {year}
            </button>
          </div>
          <div
            class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-12 gap-y-8 default-typeface"
          >
            {#each months as { days, monthIndex }}
              {@const isFutureMonth = resolveIfFutureMonth(year, monthIndex)}
              {@const isCurrentMonth = resolveIfCurrentMonth(year, monthIndex)}
              {@const isSelectedMonth =
                selectedScale === TimeScaleUnit.MONTH &&
                selectedDate.getFullYear() === year &&
                selectedDate.getMonth() === monthIndex}
              <div
                class={cn(
                  "flex flex-col min-w-[240px] p-4 transition-all duration-300 has-[.first:hover]:bg-bgs2 rounded-md",
                  {
                    "bg-bgs2": isSelectedMonth
                  }
                )}
                id="month-{year}-{monthIndex}"
              >
                <button
                  class={cn(
                    "first flex items-center gap-1 mb-1 ml-3 font-medium text-h5 hover:text-aps1 transition-colors cursor-pointer text-left",
                    {
                      "text-fgs4": isFutureMonth && !isSelectedMonth,
                      "text-fgs1":
                        !isFutureMonth && !isCurrentMonth && !isSelectedMonth,
                      "text-ass1": isCurrentMonth && !isSelectedMonth,
                      "text-aps1 font-bold": isSelectedMonth
                    }
                  )}
                  on:click={() => handleMonthSelect(year, monthIndex)}
                >
                  <span>{monthNames[monthIndex]}</span>
                  <span class="text-fgs4">{year}</span>
                </button>
                <div class="grid grid-cols-7 gap-x-1 text-center text-b2">
                  {#each weekDays as day}
                    <div class="text-fgs4 mb-1 text-b4">{day}</div>
                  {/each}
                  {#each days as date}
                    {#if date}
                      {@const isSelected =
                        selectedScale === TimeScaleUnit.DAY &&
                        isSameDay(selectedDate, date)}
                      {@const isCurrentDay = isToday(date)}
                      {@const isPastDay = isPastDate(date)}
                      <button
                        class={cn(
                          "py-1 rounded-md border flex flex-col items-center h-9 max-w-9",
                          {
                            "bg-aps1 text-abg border-transparent": isSelected,
                            "text-ass1 font-medium border-ass1 notouch:hover:bg-ass2 active:bg-ass2":
                              isCurrentDay && !isSelected
                          },
                          !isSelected &&
                            !isCurrentDay && {
                              "hover:text-fgs1 border-transparent": true,
                              "notouch:hover:bg-bgs2 active:bg-bgs2":
                                !isSelectedMonth,
                              "notouch:hover:bg-bgs3 active:bg-bgs3":
                                isSelectedMonth,
                              "text-fgs1 border-transparent": isPastDay,
                              "text-fgs3": !isPastDay
                            }
                        )}
                        on:click={() => {
                          selectedDate = date;
                          dispatch("dateChange", { date });
                        }}
                      >
                        {date.getDate()}
                        {#if indicatorData.length > 0 && showYearIndicators}
                          <CalendarTileIndicator
                            {date}
                            {indicatorRefreshId}
                            data={indicatorData}
                            isActive={isSelected}
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
  </div>
</div>
