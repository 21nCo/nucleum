<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import Divider from "../../Divider.svelte";
  import Icon from "../../Icon.svelte";
  import dayjs from "dayjs";
  import "dayjs/locale/en";
  import { Size } from "../../../types/size.enum";
  import Button from "../../button/Button.svelte";
  import { abg, bg, cn } from "$lib/client/utils/ui.utils";
  import { isSameDay } from "$lib/client/utils/time.utils";
  import DateInputBox from "./DateInputBox.svelte";

  const dispatch = createEventDispatcher();

  export let parentBgIndex: number = 0;
  export let isDatePickerMode: boolean = false;
  export let selectedDate: Date = new Date();

  export let initialStartDate: Date | null = null;
  export let initialEndDate: Date | null = null;
  export let onDateChange: (val: Date) => void;
  export let onRangeChange: (val: { start: string; end: string }) => void;

  const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
  const MONTHS = Array.from({ length: 12 }, (_, i) =>
    dayjs().month(i).format("MMM")
  );

  let today = dayjs();
  let currentView =
    initialStartDate && dayjs(initialStartDate).isValid()
      ? dayjs(initialStartDate)
      : dayjs();
  let selectedYear = currentView.year();

  let startDate: dayjs.Dayjs | null =
    initialStartDate && dayjs(initialStartDate).isValid()
      ? dayjs(initialStartDate)
      : null;
  let endDate: dayjs.Dayjs | null =
    initialEndDate && dayjs(initialEndDate).isValid()
      ? dayjs(initialEndDate)
      : null;
  let isSelectingEnd = false;

  let visibleMonths: dayjs.Dayjs[] = [];

  let startDateInput = "";
  let endDateInput = "";

  $: {
    visibleMonths = Array.from({ length: 12 }, (_, i) =>
      dayjs().month(i).startOf("month")
    );
    if (startDate) {
      startDateInput = "";
    }
    if (endDate) {
      endDateInput = "";
    }
  }

  $: selectedMonth = currentView.month();
  $: calendarRows = generateCalendarRows(currentView);
  $: if (isDatePickerMode && selectedDate) {
    currentView = dayjs(selectedDate);
    selectedYear = currentView.year();
  }

  onMount(() => {
    dayjs.locale("en");
  });

  function generateCalendarRows(date: dayjs.Dayjs) {
    const firstDayOfMonth = date.startOf("month");
    const lastDayOfMonth = date.endOf("month");
    const startDayIndex =
      firstDayOfMonth.day() === 0 ? 6 : firstDayOfMonth.day() - 1;

    const rows: (number | null)[][] = Array(6)
      .fill(0)
      .map(() => Array(7).fill(null));

    let currentDate = firstDayOfMonth;
    let weekRow = 0;
    let weekDay = startDayIndex;

    while (currentDate.isSame(lastDayOfMonth, "month")) {
      rows[weekRow][weekDay] = currentDate.date();
      weekDay++;
      if (weekDay === 7) {
        weekDay = 0;
        weekRow++;
      }
      currentDate = currentDate.add(1, "day");
    }

    return rows;
  }

  function handleYearChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const year = parseInt(input.value);
    if (!isNaN(year) && year > 1900 && year < 2100) {
      selectedYear = year;
      currentView = currentView.year(year);
    }
  }

  function selectMonth(month: number) {
    currentView = currentView.month(month - 1);
  }

  function selectDate(day: number) {
    const selectedDay = currentView.date(day);

    if (isDatePickerMode) {
      selectedDate = selectedDay.toDate();
      dispatchDateChange(selectedDate);
      return;
    }

    if (!startDate || isSelectingEnd) {
      if (!startDate || selectedDay.isAfter(startDate)) {
        if (!isSelectingEnd) {
          startDate = selectedDay;
          isSelectingEnd = true;
          dispatchRangeChange({
            start: startDate.format("YYYY-MM-DD"),
            end: endDate ? endDate.format("YYYY-MM-DD") : ""
          });
        } else {
          endDate = selectedDay;
          isSelectingEnd = false;
          dispatchRangeChange({
            start: startDate ? startDate.format("YYYY-MM-DD") : "",
            end: endDate.format("YYYY-MM-DD")
          });
        }
      } else {
        startDate = selectedDay;
        endDate = null;
        isSelectingEnd = true;
        dispatchRangeChange({
          start: startDate.format("YYYY-MM-DD"),
          end: ""
        });
      }
    } else {
      if (endDate && selectedDay.isBefore(endDate)) {
        startDate = selectedDay;
        isSelectingEnd = true;
        dispatchRangeChange({
          start: startDate.format("YYYY-MM-DD"),
          end: endDate.format("YYYY-MM-DD")
        });
      } else {
        startDate = selectedDay;
        endDate = null;
        isSelectingEnd = true;
        dispatchRangeChange({
          start: startDate.format("YYYY-MM-DD"),
          end: ""
        });
      }
    }
  }

  function dispatchDateChange(val: Date) {
    dispatch("change", val);
    onDateChange(val);
  }

  function dispatchRangeChange(val: { start: string; end: string }) {
    dispatch("rangePicked", val);
    onRangeChange(val);
  }

  function isDateInRange(date: dayjs.Dayjs): boolean {
    if (!startDate || !endDate) return false;
    return (
      (date.isAfter(startDate) || date.isSame(startDate, "day")) &&
      (date.isBefore(endDate) || date.isSame(endDate, "day"))
    );
  }

  function resetSelection(resetStart = false, resetEnd = false) {
    if (resetStart) {
      startDate = null;
      isSelectingEnd = false;
      dispatchRangeChange({
        start: "",
        end: endDate ? endDate.format("YYYY-MM-DD") : ""
      });
    }
    if (resetEnd) {
      endDate = null;
      isSelectingEnd = true;
      dispatchRangeChange({
        start: startDate ? startDate.format("YYYY-MM-DD") : "",
        end: ""
      });
    }
  }

  function setSelectionMode(selectingEnd: boolean, event: MouseEvent) {
    event.stopPropagation();
    isSelectingEnd = selectingEnd;

    // Update the calendar view to show the selected date's month
    if (selectingEnd && endDate) {
      currentView = endDate;
      selectedYear = endDate.year();
    } else if (!selectingEnd && startDate) {
      currentView = startDate;
      selectedYear = startDate.year();
    }
  }

  function handleClearClick(clearStart: boolean, event: MouseEvent) {
    event.stopPropagation();
    resetSelection(clearStart, !clearStart);
  }

  function navigateMonth(delta: number) {
    currentView = currentView.add(delta, "month");
  }

  function navigateYear(delta: number) {
    selectedYear += delta;
    currentView = currentView.year(selectedYear);
  }

  function handleDateInput(input: string, isStart: boolean) {
    // Handle incomplete dates
    if (input.length < 10) {
      if (isStart) {
        startDateInput = input;
      } else {
        endDateInput = input;
      }

      // Try to parse year if we have enough digits
      if (input.length >= 4) {
        const year = parseInt(input.substring(0, 4));
        if (!isNaN(year) && year >= 1900 && year <= 2100) {
          selectedYear = year;
          currentView = currentView.year(year);
        }
      }

      // Try to parse month if we have enough digits
      if (input.length >= 7) {
        const month = parseInt(input.substring(5, 7));
        if (!isNaN(month) && month >= 1 && month <= 12) {
          currentView = currentView.month(month - 1);
        }
      }

      return;
    }

    // Parse complete date
    const parsed = dayjs(input, "YYYY-MM-DD", true);
    if (parsed.isValid()) {
      if (isStart) {
        startDate = parsed;
        startDateInput = input;
        if (!isSelectingEnd) {
          currentView = parsed;
          selectedYear = parsed.year();
        }
        dispatchRangeChange({
          start: startDate.format("YYYY-MM-DD"),
          end: endDate ? endDate.format("YYYY-MM-DD") : ""
        });
      } else {
        if (startDate && parsed.isBefore(startDate)) {
          return;
        }
        endDate = parsed;
        endDateInput = input;
        if (isSelectingEnd) {
          currentView = parsed;
          selectedYear = parsed.year();
        }
        dispatchRangeChange({
          start: startDate ? startDate.format("YYYY-MM-DD") : "",
          end: endDate.format("YYYY-MM-DD")
        });
      }
    }
  }
</script>

<button
  class={cn(
    "flex flex-col gap-4 w-[20rem] p-4 text-fgs3 rounded-md shadow-lg border border-brs2",
    {
      [bg(parentBgIndex)]: true
    }
  )}
  on:click|stopPropagation
>
  {#if !isDatePickerMode}
    <div class="flex w-full gap-4">
      <DateInputBox
        {parentBgIndex}
        isSelected={!isSelectingEnd}
        selectedDate={startDate}
        dateInput={startDateInput}
        label="Start"
        onInputChange={(value) => handleDateInput(value, true)}
        onClear={(e) => handleClearClick(true, e)}
        onBoxClick={(e) => setSelectionMode(false, e)}
      />
      <DateInputBox
        {parentBgIndex}
        isSelected={isSelectingEnd}
        selectedDate={endDate}
        dateInput={endDateInput}
        label="End"
        onInputChange={(value) => handleDateInput(value, false)}
        onClear={(e) => handleClearClick(false, e)}
        onBoxClick={(e) => setSelectionMode(true, e)}
      />
    </div>
    <Divider />
  {/if}
  <div class="flex items-center w-full justify-between text-b2">
    <div class="flex gap-2 items-center">
      <Button
        icon="ph:caret-left"
        size={Size.xs}
        on:click={() => navigateYear(-1)}
      />
      <input
        type="number"
        min="1900"
        max="2100"
        class={cn("w-20 px-2 py-1 rounded-md", bg(parentBgIndex + 1))}
        value={selectedYear}
        on:change={handleYearChange}
      />
      <Button
        icon="ph:caret-right"
        size={Size.xs}
        on:click={() => navigateYear(1)}
      />
    </div>
    {#if !isSameDay(selectedDate, new Date())}
      <Button
        icon="calendar"
        label="Today"
        size={Size.xs}
        on:click={() => {
          currentView = today;
          selectedYear = today.year();
        }}
      />
    {/if}
  </div>

  <div class="grid grid-rows-2 gap-1">
    <div class="grid grid-cols-6 gap-1">
      {#each MONTHS.slice(0, 6) as month, i}
        <button
          class={cn(
            "px-1.5 py-1 rounded-md text-b3 transition-colors",
            i === selectedMonth ? abg() : "hover:bg-bgs2"
          )}
          on:click={() => selectMonth(i + 1)}
        >
          {month}
        </button>
      {/each}
    </div>
    <div class="grid grid-cols-6 gap-1">
      {#each MONTHS.slice(6) as month, i}
        <button
          class={cn(
            "px-1.5 py-1 rounded-md text-b3 transition-colors",
            i + 6 === selectedMonth ? abg() : "hover:bg-bgs2"
          )}
          on:click={() => selectMonth(i + 7)}
        >
          {month}
        </button>
      {/each}
    </div>
  </div>

  <div class="flex flex-col w-full">
    <table class="w-full text-b3 border-separate border-spacing-0">
      <thead>
        <tr>
          {#each DAYS as day}
            <td>
              <div class="flex w-full p-1 justify-center">
                <p class="text-center text-[10px] text-fgs2">{day}</p>
              </div>
            </td>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each generateCalendarRows(currentView) as week}
          <tr>
            {#each week as day}
              <td class="p-0">
                {#if day !== null}
                  {@const currentDate = currentView.date(day)}
                  <div
                    class="flex w-full h-7 justify-center items-center relative"
                  >
                    {#if startDate && endDate && isDateInRange(currentDate)}
                      <div class="absolute inset-0 bg-aps2/20" />
                    {/if}
                    {#if (startDate && currentDate.isSame(startDate, "day")) || (endDate && currentDate.isSame(endDate, "day"))}
                      <div class="absolute inset-0 bg-aps1" />
                    {/if}
                    <button
                      class={cn(
                        "rounded-md w-6 h-6 flex items-center justify-center relative z-10",
                        {
                          "text-abg":
                            (startDate &&
                              currentDate.isSame(startDate, "day")) ||
                            (endDate && currentDate.isSame(endDate, "day")),
                          "bg-ass1 text-abg font-medium":
                            currentDate.isSame(today, "day") &&
                            !currentDate.isSame(startDate, "day") &&
                            !currentDate.isSame(endDate, "day"),
                          "hover:bg-bgs2":
                            !currentDate.isSame(today, "day") &&
                            !isDateInRange(currentDate) &&
                            !currentDate.isSame(startDate, "day") &&
                            !currentDate.isSame(endDate, "day")
                        }
                      )}
                      on:click={() => selectDate(day)}
                    >
                      {day}
                    </button>
                  </div>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</button>
