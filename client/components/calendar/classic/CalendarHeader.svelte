<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonVariant } from "@21n/types/button.type";
  import { createEventDispatcher } from "svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import { TimeScaleUnit } from "@21n/types/time.type";
  import DatePicker from "@21n/elements/datetime/DatePicker.svelte";

  const dispatch = createEventDispatcher();

  export let selectedDate: Date;
  export let selectedView: TimeScaleUnit = TimeScaleUnit.MONTH;
  export let visibleWeekDates: Date[] | undefined = undefined;
  export let parentBgIndex: number = 2;

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
      dispatch("dateChange");
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
      dispatch("dateChange");
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

<div class="flex items-center gap-4 justify-center">
  <Button
    type={ButtonVariant.SECONDARY}
    style={ButtonStyle.DEFAULT}
    icon="chevron-left"
    size={Size.sm}
    {parentBgIndex}
    on:click={goToPrevious}
  />
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
    {:else if selectedView === TimeScaleUnit.MONTH}
      {currentMonth} {currentYear}
    {:else}
      <DatePicker bind:date={selectedDate} variant="inline" />
    {/if}
  </h2>
  <Button
    type={ButtonVariant.SECONDARY}
    style={ButtonStyle.DEFAULT}
    icon="chevron-right"
    size={Size.sm}
    {parentBgIndex}
    on:click={goToNext}
  />
</div>
