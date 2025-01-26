<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { createEventDispatcher } from "svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { ButtonStyle } from "$lib/client/types/button.type";

  const dispatch = createEventDispatcher();

  export let selectedDate: Date;
  export let selectedView: "month" | "week" | "day" | "year" = "month";
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
    if (selectedView === "year" || selectedView === "week") {
      dispatch("goToPrevious");
    } else {
      const date = new Date(selectedDate);
      switch (selectedView) {
        case "month":
          date.setMonth(date.getMonth() - 1);
          break;
        case "day":
          date.setDate(date.getDate() - 1);
          break;
      }
      selectedDate = date;
    }
  }

  function goToNext() {
    if (selectedView === "year" || selectedView === "week") {
      dispatch("goToNext");
    } else {
      const date = new Date(selectedDate);
      switch (selectedView) {
        case "month":
          date.setMonth(date.getMonth() + 1);
          break;
        case "day":
          date.setDate(date.getDate() + 1);
          break;
      }
      selectedDate = date;
    }
  }

  function goToToday() {
    if (selectedView === "year" || selectedView === "week") {
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

<header
  class="flex items-center justify-between p-4 border-b border-brs3 bg-bgs1 sticky top-0 z-10"
>
  <div class="flex items-center gap-4">
    <Button
      type={ButtonVariant.PRIMARY}
      style={ButtonStyle.DEFAULT}
      size={Size.sm}
      label="Go to today"
      on:click={goToToday}
    />
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
      {#if selectedView === "year"}
        {currentYear}
      {:else if selectedView === "week"}
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
      type={selectedView === "day"
        ? ButtonVariant.PRIMARY
        : ButtonVariant.SECONDARY}
      style={ButtonStyle.OUTLINED}
      size={Size.sm}
      isPreventMinWidth={true}
      label="Day"
      on:click={() => (selectedView = "day")}
    />
    <Button
      type={selectedView === "week"
        ? ButtonVariant.PRIMARY
        : ButtonVariant.SECONDARY}
      style={ButtonStyle.OUTLINED}
      size={Size.sm}
      isPreventMinWidth={true}
      label="Week"
      on:click={() => (selectedView = "week")}
    />
    <Button
      type={selectedView === "month"
        ? ButtonVariant.PRIMARY
        : ButtonVariant.SECONDARY}
      style={ButtonStyle.OUTLINED}
      size={Size.sm}
      isPreventMinWidth={true}
      label="Month"
      on:click={() => (selectedView = "month")}
    />
    <Button
      type={selectedView === "year"
        ? ButtonVariant.PRIMARY
        : ButtonVariant.SECONDARY}
      style={ButtonStyle.OUTLINED}
      size={Size.sm}
      isPreventMinWidth={true}
      label="Year"
      on:click={() => (selectedView = "year")}
    />
  </div>
</header>
