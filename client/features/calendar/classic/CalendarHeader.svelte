<script lang="ts">
  import { TimeScaleUnit } from "@21n/shared-utils/datetime/period.type";
  import DatePicker from "@21n/ui/elements/datetime/DatePicker.svelte";
  import { cn } from "@21n/ui/environment/presentation";
  import BoxButton from "@21n/ui/elements/button/BoxButton.svelte";

  let {
    selectedDate = $bindable(new Date()),
    selectedView = $bindable(TimeScaleUnit.MONTH),
    visibleWeekDates = undefined,
    parentBgIndex = 2,
    onDateChange = undefined,
    onGoToPrevious = undefined,
    onGoToNext = undefined,
    isShortDate = false
  }: {
    selectedDate?: Date;
    selectedView?: TimeScaleUnit;
    visibleWeekDates?: Date[];
    parentBgIndex?: number;
    onDateChange?: (() => void) | undefined;
    onGoToPrevious?: (() => void) | undefined;
    onGoToNext?: (() => void) | undefined;
    /** Shortens month names so the header fits a narrow top bar. */
    isShortDate?: boolean;
  } = $props();

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

  function goToPrevious() {
    if (
      selectedView === TimeScaleUnit.YEAR ||
      selectedView === TimeScaleUnit.WEEK
    ) {
      onGoToPrevious?.();
    } else {
      const date = new Date(selectedDate);
      switch (selectedView) {
        case TimeScaleUnit.MONTH:
          date.setMonth(date.getMonth() - 1);
          break;
        case TimeScaleUnit.DAY:
          date.setDate(date.getDate() - 1);
          break;
      }
      selectedDate = date;
      onDateChange?.();
    }
  }

  function goToNext() {
    if (
      selectedView === TimeScaleUnit.YEAR ||
      selectedView === TimeScaleUnit.WEEK
    ) {
      onGoToNext?.();
    } else {
      const date = new Date(selectedDate);
      switch (selectedView) {
        case TimeScaleUnit.MONTH:
          date.setMonth(date.getMonth() + 1);
          break;
        case TimeScaleUnit.DAY:
          date.setDate(date.getDate() + 1);
          break;
      }
      selectedDate = date;
      onDateChange?.();
    }
  }

  function getWeekDates(date: Date) {
    const week = [];
    const current = new Date(date);
    current.setDate(current.getDate() - current.getDay()); // Start from Sunday

    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return week;
  }

  const weekDates = $derived(getWeekDates(selectedDate));
  const currentMonth = $derived(monthName(selectedDate.getMonth()));
  const weekLabel = $derived(
    visibleWeekDates && visibleWeekDates.length >= 7
      ? formatWeekRange(
          visibleWeekDates[0],
          visibleWeekDates[6],
          visibleWeekDates[6].getFullYear()
        )
      : formatWeekRange(weekDates[0], weekDates[6], currentYear)
  );

  function monthName(month: number) {
    const name = monthNames[month];
    return isShortDate ? name.slice(0, 3) : name;
  }

  /**
   * Week range label. Short labels drop the repeated month and the current
   * year, for example "Nov 8 - 14"; full labels keep both months and the year.
   */
  function formatWeekRange(start: Date, end: Date, year: number) {
    const startMonth = monthName(start.getMonth());
    const endMonth = monthName(end.getMonth());
    const endPart =
      isShortDate && start.getMonth() === end.getMonth()
        ? `${end.getDate()}`
        : `${endMonth} ${end.getDate()}`;
    const yearPart =
      isShortDate && year === new Date().getFullYear() ? "" : `, ${year}`;
    return `${startMonth} ${start.getDate()} - ${endPart}${yearPart}`;
  }
  const currentYear = $derived(selectedDate.getFullYear());
</script>

<div class="flex items-center justify-center">
  <div class="h-full w-10">
    <BoxButton
      icon="chevron-left"
      ariaLabel="Previous calendar period"
      onclick={goToPrevious}
    />
  </div>
  <h2
    class={cn("text-h4 h-full  flex items-center justify-center px-3", {
      "hover:bg-bgs2-striped": selectedView === TimeScaleUnit.DAY
    })}
  >
    {#if selectedView === TimeScaleUnit.YEAR}
      {currentYear}
    {:else if selectedView === TimeScaleUnit.WEEK}
      {weekLabel}
    {:else if selectedView === TimeScaleUnit.MONTH}
      {currentMonth} {currentYear}
    {:else}
      <DatePicker bind:date={selectedDate} variant="inline-with-icon" />
    {/if}
  </h2>
  <div class="h-full w-10">
    <BoxButton
      icon="chevron-right"
      ariaLabel="Next calendar period"
      onclick={goToNext}
    />
  </div>
</div>
