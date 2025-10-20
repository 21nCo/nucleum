<script lang="ts">
  import Roller from "@21n/components/calendar/birdView/Roller.svelte";
  import {
    Itemtype,
    Modes,
    type ProgrammedVerticalWheelEvent
  } from "@21n/components/calendar/birdView/Birdview.type";
  import {
    currentDate,
    currentMonth,
    currentMonthEndDate,
    currentYear,
    getDaysInMonth,
    getLastAlphabetPosition,
    waitForTimeout
  } from "@21n/components/calendar/birdView/Birdview.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import { debouncer } from "@21n/utils/utils";
  const dispatch = createEventDispatcher();
  let containerHeight: number;
  let monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  export let mode: Modes;

  let selectedYear: number = currentYear;
  let selectedMonth: string = currentYear + currentMonth;
  let selectedMonthEndDate: number = currentMonthEndDate;
  let selectedDate: string = selectedMonth + currentDate.getDate();
  let lowerYearLimit = currentYear - 25;
  let years: any[] = Array.from({ length: 50 }, (_, i) => lowerYearLimit + i);
  let yearsForMonths: any[] = getYearsForMonths();
  let days: string[] = [];

  let monthContainer: HTMLDivElement;
  let yearContainer: HTMLDivElement;
  let dayContainer: HTMLDivElement;
  let scrollToSelectedYear: () => void;
  let scrollToSelectedMonth: () => void;
  let scrollToSelectedDay: () => void;

  let rollerConfig = {
    itemHeight: 24,
    containerHeight: 744
  };

  const debouncedDispatchSelectedDateReset = debouncer(
    () => dispatch("selectedDateReset", selectedDate),
    200
  );

  const debouncedDispatchSelectedMonthReset = debouncer(
    () => dispatch("selectedMonthReset", selectedMonth),
    200
  );

  function getDatesInMonth(year: number, month: number) {
    const numDays = new Date(year, month + 1, 0).getDate();
    return Array.from(
      { length: numDays },
      (_, i) => `${selectedYear}${monthNames[month]}${i + 1}`
    );
  }

  function updateDays() {
    days = [];
    const monthIndex = monthNames.indexOf(selectedMonth.slice(-3));
    const x = monthIndex == 0 ? 11 : monthIndex - 1;
    const y = monthIndex;
    const z = monthIndex == 11 ? 0 : monthIndex + 1;
    days = [
      ...getDatesInMonth(selectedYear, x),
      ...getDatesInMonth(selectedYear, y),
      ...getDatesInMonth(selectedYear, z)
    ];
  }
  updateDays();

  /**
   * A closure function to remember the previous month so that it can be used to update the days roller when year changes and also invoked on month change with the month value.
   */
  let updateSelectedMonthEndDate = (function () {
    let prevMonth = selectedMonth;
    return function (updateToMonth?: string) {
      if (updateToMonth != undefined) prevMonth = updateToMonth;
      selectedMonthEndDate = getDaysInMonth(
        monthNames.indexOf(prevMonth),
        selectedYear
      );
    };
  })();

  function updateSelectedYear(isPositive: boolean) {
    if (isPositive) {
      selectedYear = Number(selectedYear) + 1;
    } else {
      selectedYear = Number(selectedYear) - 1;
    }
  }

  function getTopElement(items: any[]): number {
    let value: number = 0;
    items.forEach((item: number) => {
      const selectedItemElement: HTMLElement | null =
        yearContainer.querySelector(`[data-year="${item}"]`);
      if (
        Math.ceil(yearContainer.scrollTop) + 77 ==
        selectedItemElement?.offsetTop
      ) {
        value = item;
      }
    });
    return value;
  }

  function updateYears(isPositive: boolean) {
    if (isPositive) {
      years = [...years, years[years.length - 1] + 1];
      years.shift();
      yearsForMonths = [
        ...yearsForMonths,
        yearsForMonths[yearsForMonths.length - 1] + 1
      ];
      yearsForMonths.shift();
    } else {
      years = [years[0] - 1, ...years];
      years.pop();
      yearsForMonths = [yearsForMonths[0] - 1, ...yearsForMonths];
      yearsForMonths.pop();
    }
  }

  function getYearsForMonths() {
    const index = years.findIndex((year) => year == selectedYear);
    if (index !== -1) {
      const start = Math.max(0, index - 3);
      const end = Math.min(years.length, index + 4);
      const surroundingYears = years.slice(start, end);
      return surroundingYears;
    }
    return [];
  }

  async function handleYearsWheelEvent(
    e: WheelEvent | ProgrammedVerticalWheelEvent
  ): Promise<void | true> {
    if (e instanceof WheelEvent) e.preventDefault();
    if (e.deltaY > 0) {
      if (selectedYear == 9969) return true;
      updateYears(true);
      updateSelectedYear(true);
    } else {
      if (selectedYear == 0) return true;
      updateYears(false);
      updateSelectedYear(false);
    }
    await waitForTimeout(scrollToSelectedYear);
    selectedMonth = selectedYear + selectedMonth.slice(-3);
    updateSelectedMonthEndDate();
    updateDays();
    const lastAlphIndex = getLastAlphabetPosition(selectedDate);
    if (e instanceof WheelEvent || e.isWheelEvent == true) {
      selectedDate =
        selectedYear +
        selectedMonth.slice(-3) +
        (Number(selectedDate.slice(lastAlphIndex + 1)) > selectedMonthEndDate
          ? selectedMonthEndDate
          : selectedDate.slice(lastAlphIndex + 1));
      if (mode == Modes.ZONES) {
        debouncedDispatchSelectedDateReset();
        await waitForTimeout(scrollToSelectedDay);
      } else if (mode == Modes.DAYS) debouncedDispatchSelectedMonthReset();
      else if (mode == Modes.MONTHS)
        if (!e?.isPanelEvent) {
          dispatch("selectedYearChange", {
            selectedYear,
            isPostive: e?.deltaY > 0
          });
        }
    }
  }

  async function handleMonthsWheelEvent(
    e: WheelEvent | ProgrammedVerticalWheelEvent
  ): Promise<void | true> {
    if (e instanceof WheelEvent) e.preventDefault();
    let updateToMonth;
    const month = selectedMonth.slice(-3);
    const monthIndex = monthNames.indexOf(month);
    let limitReached: Promise<true | void>;
    if (e.deltaY > 0) {
      if (month == "Dec") {
        limitReached = handleYearsWheelEvent({
          deltaY: 1,
          isWheelEvent: false
        });
        if (await limitReached) {
          return true;
        }
      }
      updateToMonth = monthNames[(monthIndex + 1) % 12];
      selectedMonth = selectedYear + updateToMonth;
    } else {
      if (month == "Jan") {
        limitReached = handleYearsWheelEvent({
          deltaY: -1,
          isWheelEvent: false
        });
        if (await limitReached) {
          return true;
        }
      }
      updateToMonth = monthNames[monthIndex == 0 ? 11 : monthIndex - 1];
      selectedMonth = selectedYear + updateToMonth;
    }
    await waitForTimeout(scrollToSelectedMonth);
    updateSelectedMonthEndDate(selectedMonth.slice(-3));
    updateDays();
    const lastAlphIndex = getLastAlphabetPosition(selectedDate);
    selectedDate =
      selectedYear +
      selectedMonth.slice(-3) +
      (Number(selectedDate.slice(lastAlphIndex + 1)) > selectedMonthEndDate
        ? selectedMonthEndDate
        : selectedDate.slice(lastAlphIndex + 1));
    if (e instanceof WheelEvent || e.isWheelEvent == true) {
      if (mode == Modes.ZONES) {
        debouncedDispatchSelectedDateReset();
        await waitForTimeout(scrollToSelectedDay);
      } else if (mode == Modes.DAYS)
        dispatch("selectedMonthChange", {
          selectedMonth,
          isPostive: e?.deltaY > 0
        });
    }
  }

  async function handleDaysWheelEvent(
    e: WheelEvent | ProgrammedVerticalWheelEvent
  ) {
    if (e instanceof WheelEvent) e.preventDefault();
    let day: number;
    const lastAlphIndex = getLastAlphabetPosition(selectedDate);
    if (e.deltaY > 0) {
      const lastMonthIndex = monthNames.indexOf(
        days[days.length - 1].slice(4, 7)
      );
      day = Number(selectedDate.slice(lastAlphIndex + 1)) + 1;
      if (day <= selectedMonthEndDate) {
        selectedDate = selectedYear + selectedMonth.slice(-3) + day;
      } else {
        const monthIndex = monthNames.indexOf(selectedMonth.slice(-3));
        if (monthIndex == 11 && selectedYear == 9969) return true;
        const month = monthNames[(monthIndex + 1) % 12];
        selectedDate = selectedYear + month + 1;
        handleMonthsWheelEvent({ deltaY: 1, isWheelEvent: false });
      }
    } else {
      day = Number(selectedDate.slice(lastAlphIndex + 1)) - 1;
      if (day >= 1) selectedDate = selectedYear + selectedMonth.slice(-3) + day;
      else {
        const monthIndex = monthNames.indexOf(selectedMonth.slice(-3));
        if (monthIndex == 0 && selectedYear == 0) return true;
        const month = monthNames[monthIndex == 0 ? 11 : monthIndex - 1];
        updateSelectedMonthEndDate(month);
        selectedDate = selectedYear + month + selectedMonthEndDate;
        handleMonthsWheelEvent({ deltaY: -1, isWheelEvent: false });
      }
    }

    if (!e?.isPanelEvent) {
      dispatch("selectedDateChange", {
        selectedDate,
        isPostive: e?.deltaY > 0
      });
    }
    await waitForTimeout(scrollToSelectedDay);
  }
  onMount(() => {
    rollerConfig = {
      itemHeight: 24,
      containerHeight: containerHeight
    };
    if (mode == Modes.ZONES) dispatch("selectedDateChange", selectedDate);
    else if (mode == Modes.DAYS) dispatch("selectedMonthChange", selectedMonth);
    else if (mode == Modes.MONTHS) dispatch("selectedYearChange", selectedYear);

    dispatch("mount", {
      handleDaysWheelEvent,
      handleMonthsWheelEvent,
      handleYearsWheelEvent
    });
  });
</script>

<div
  class="relative flex p-1 gap-1 border border-brs3 default-typeface"
  bind:clientHeight={containerHeight}
>
  {#if mode == Modes.MONTHS || mode == Modes.DAYS || mode == Modes.ZONES}
    <Roller
      handleWheelEvent={handleYearsWheelEvent}
      items={years}
      bind:container={yearContainer}
      bind:selectedItem={selectedYear}
      config={{ ...rollerConfig, itemType: Itemtype.YEAR }}
      on:mount={(e) => (scrollToSelectedYear = e.detail)}
    />
  {/if}
  {#if mode == Modes.DAYS || mode == Modes.ZONES}
    <Roller
      handleWheelEvent={handleMonthsWheelEvent}
      items={yearsForMonths}
      bind:container={monthContainer}
      bind:selectedItem={selectedMonth}
      config={{ ...rollerConfig, itemType: Itemtype.MONTH }}
      on:mount={(e) => (scrollToSelectedMonth = e.detail)}
    />
  {/if}
  {#if mode == Modes.ZONES}
    <Roller
      handleWheelEvent={handleDaysWheelEvent}
      items={days}
      bind:container={dayContainer}
      bind:selectedItem={selectedDate}
      config={{ ...rollerConfig, itemType: Itemtype.DAY }}
      on:mount={(e) => (scrollToSelectedDay = e.detail)}
    />
  {/if}
  <div
    class="-ml-1 w-full bg-bgs4 opacity-50"
    style="position:absolute;top:{containerHeight / 2 -
      rollerConfig.itemHeight}px;height:{rollerConfig.itemHeight}px;max-height:{rollerConfig.itemHeight}px;"
  ></div>
</div>
