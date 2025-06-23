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
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import view from "$lib/client/stores/view.store";
  import { CalendarLayout } from "../calendar.type";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Product } from "$lib/client/types/product.type";
  const dispatch = createEventDispatcher();

  export let selectedDate: Date;
  export let selectedView: TimeScaleUnit = TimeScaleUnit.MONTH;
  export let visibleWeekDates: Date[] | undefined = undefined;
  export let isRefreshing: boolean = false;
  export let parentBgIndex: number = 2;
  let dev_isEnableSettings: boolean = false;

  const switchOptions = [
    {
      label: "Day",
      icon: "text:D",
      value: TimeScaleUnit.DAY
    },
    // {
    //   label: "Week",
    //   icon: "text:W",
    //   value: TimeScaleUnit.WEEK
    // },
    {
      label: "Month",
      icon: "text:M",
      value: TimeScaleUnit.MONTH
    },
    {
      label: "Year",
      icon: "text:Y",
      value: TimeScaleUnit.YEAR
    }
    // {
    //   label: "Heatmap",
    //   icon: "text:H",
    //   value: CalendarLayout.Heatmap
    // }
  ];

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

  /**
   * TODO - test for bugs for setting selectedDate in year and week view
   */
  function goToToday() {
    if (
      selectedView === TimeScaleUnit.YEAR ||
      selectedView === TimeScaleUnit.WEEK
    ) {
      dispatch("goToToday");
      selectedDate = new Date();
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

  function onScaleSelection(e: CustomEvent) {
    if (!e.detail) return;
    selectedView = e.detail;
    uiState.setState(UIState.classicCalendarScale, selectedView, {
      scope: UIStateScope.DAP
    });
    dispatch("scaleSelection", selectedView);
  }
</script>

<header class="grid grid-cols-3 w-full sticky top-0 z-10">
  <div class="flex items-center gap-2">
    <div>
      {#if $appStore.product !== Product.MEMOTRON}
        {#if $view.isConstrainedWidth}
          <DropDown
            items={switchOptions}
            value={selectedView}
            isDisableSearch={true}
            width="min-w-32"
            size={Size.sm}
            isEnforceWidth={true}
            on:select={onScaleSelection}
          />
        {:else}
          <OptionSelector
            options={switchOptions}
            selected={selectedView}
            size={Size.sm}
            {parentBgIndex}
            isExpandOnActiveForIcon={true}
            style={OptionSelectorStyle.ICON}
            on:select={onScaleSelection}
          />
        {/if}
      {/if}
    </div>
    {#if isRefreshing}
      <Icon icon="svg-spinners:180-ring-with-bg" size={Size.sm} />
    {/if}
  </div>
  <div class="flex items-center gap-4">
    <Button
      type={ButtonVariant.SECONDARY}
      style={ButtonStyle.DEFAULT}
      icon="ph:caret-left-light"
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
        <!-- TODO Date picker -->
        <!-- {selectedDate.getDate()}
          {currentMonth}
          {currentYear} -->
        <DatePicker bind:date={selectedDate} variant="inline" />
      {/if}
    </h2>
    <Button
      type={ButtonVariant.SECONDARY}
      style={ButtonStyle.DEFAULT}
      icon="ph:caret-right-light"
      size={Size.sm}
      {parentBgIndex}
      on:click={goToNext}
    />
  </div>
  <div class="flex items-center gap-2 justify-end">
    <Button
      type={ButtonVariant.SECONDARY}
      style={ButtonStyle.OUTLINED}
      size={Size.sm}
      label="Go to today"
      isPreventMinWidth={true}
      {parentBgIndex}
      on:click={goToToday}
    />
    {#if dev_isEnableSettings}
      <Toggle icon="ph:sliders-light" bgSize={Size.sm} parentBgIndex={2} />
    {/if}
  </div>
</header>
