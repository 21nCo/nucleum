<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { createEventDispatcher } from "svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  const dispatch = createEventDispatcher();

  export let selectedDate: Date;
  export let selectedView: TimeScaleUnit = TimeScaleUnit.MONTH;
  export let visibleWeekDates: Date[] | undefined = undefined;

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
      dispatch("goToPrevious");
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
    }
  }

  function goToNext() {
    if (
      selectedView === TimeScaleUnit.YEAR ||
      selectedView === TimeScaleUnit.WEEK
    ) {
      dispatch("goToNext");
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
    }
  }

  function goToToday() {
    if (
      selectedView === TimeScaleUnit.YEAR ||
      selectedView === TimeScaleUnit.WEEK
    ) {
      dispatch("goToToday");
    } else {
      selectedDate = new Date();
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

  $: weekDates = getWeekDates(selectedDate);
  $: currentMonth = monthNames[selectedDate.getMonth()];
  $: currentYear = selectedDate.getFullYear();
</script>

<header class="flex items-center justify-between w-full sticky top-0 z-10">
  <div class="flex items-center gap-4">
    <div class="flex gap-1">
      <Button
        type={ButtonVariant.SECONDARY}
        style={ButtonStyle.OUTLINED}
        icon="ph:caret-left-light"
        size={Size.sm}
        on:click={goToPrevious}
      />
      <Button
        type={ButtonVariant.SECONDARY}
        style={ButtonStyle.OUTLINED}
        icon="ph:caret-right-light"
        size={Size.sm}
        on:click={goToNext}
      />
    </div>
    <h2 class="text-h4">
      {#if selectedView === TimeScaleUnit.YEAR}
        {currentYear}
      {:else if selectedView === TimeScaleUnit.WEEK}
        {#if visibleWeekDates && visibleWeekDates.length >= 7}
          {monthNames[visibleWeekDates[0].getMonth()]}
          {visibleWeekDates[0].getDate()} - {monthNames[
            visibleWeekDates[6].getMonth()
          ]}
          {visibleWeekDates[6].getDate()}, {visibleWeekDates[6].getFullYear()}
        {:else}
          {monthNames[weekDates[0].getMonth()]}
          {weekDates[0].getDate()} - {monthNames[weekDates[6].getMonth()]}
          {weekDates[6].getDate()}, {currentYear}
        {/if}
      {:else}
        {currentMonth} {currentYear}
      {/if}
    </h2>
  </div>
  <div class="flex items-center gap-2">
    <Button
      type={ButtonVariant.PRIMARY}
      style={ButtonStyle.OUTLINED}
      size={Size.sm}
      label="Go to today"
      isPreventMinWidth={true}
      on:click={goToToday}
    />
    <DropDown
      items={[
        {
          label: "Day",
          value: TimeScaleUnit.DAY,
          isDisabled: true,
          badge: "planned"
        },
        {
          label: "Week",
          value: TimeScaleUnit.WEEK,
          isDisabled: true,
          badge: "planned"
        },
        { label: "Month", value: TimeScaleUnit.MONTH },
        { label: "Year", value: TimeScaleUnit.YEAR }
      ]}
      value={selectedView}
      isDisableSearch={true}
      width="min-w-32"
      size={Size.sm}
      isEnforceWidth={true}
      on:select={(e) => {
        selectedView = e.detail;
      }}
    />
  </div>
</header>
