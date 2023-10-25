<script lang="ts">
  import {
    actIfClickedOutside,
    borderColor,
    generateBackgroudColor,
    getTimeLabel,
  } from "$lib/tidy/utils/utils";
  import { createEventDispatcher, onMount } from "svelte";
  import TimeSuggestionsItem from "./TimeSuggestionsItem.svelte";
  import { TimeUnit, type TimeSuggestion } from "$lib/tidy/types/time.type";
  import { appEvents, userPreferences } from "$lib/tidy/stores/app.store";
  import { ColorStrength } from "$lib/tidy/types/theme.type";
  import type { AppEventType } from "$lib/tidy/types/event.type";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  //todo - move clickoutside and pointron local code to tidy lib
  export let value: any;
  export let currentTimeUnit: TimeUnit;
  export let placeholder: string | undefined = undefined;
  export let parentBackgroundIndex: number = 1;
  export let isDisabled = false;
  let isShowSaveFeedback: boolean = false;
  export function focus() {
    if (inputRef) inputRef.focus();
  }

  let backgroundColor: string;
  let inputRef: any;
  let inputClasses: string =
    "w-full rounded-sm bg-bgs2 border p-2 text-[1.125rem] leading-8 rounded-r-none " +
    borderColor($userPreferences.theme, ColorStrength.Strong);

  let changeTimer: any;
  let changeElapsedTime: number = 0;
  let timeSuggestions: TimeSuggestion[] = [];
  let selectedIndex: number = -1;
  let inputValue: string = "";

  const dispatch = createEventDispatcher();
  const inputContainerId = "time-input-container";

  onMount(() => {
    inputValue = value.toString();
    let colors = generateBackgroudColor(parentBackgroundIndex);
    backgroundColor = colors.backgroundColor;
    inputClasses += ` bg-${backgroundColor}`;
  });

  function onChange() {
    dispatch("input", { inputValue });
    isShowSaveFeedback = false;
    if (parseFloat(inputValue) < 0) inputValue = "0";
    else if (inputValue.length === 0) resetTimeSuggestions();
    else generateTimeSuggestions();
    // if (timeSuggestions.length > 0) selectedIndex = 0;
    resetChangeTimer();
  }

  function resetChangeTimer() {
    changeElapsedTime = 0;
    clearTimeout(changeTimer);
    changeTimer = setInterval(() => {
      changeElapsedTime += 1;
    }, 1000);
  }

  //Time label is time that is shown inside the brackets in the list of time suggestion (i.e (TIME_LABEL))
  function getTimeLabelAlongWithTimeMentionedInTheInputField(
    timeInMinutes: number,
    unit: TimeUnit
  ) {
    let inputUnitLabel = "";
    let isNeedOfTimeLabel = true;
    if (unit === TimeUnit.MINUTES) {
      inputUnitLabel = parseFloat(inputValue) > 1 ? "mins" : "min";
    } else if (unit === TimeUnit.HOURS) {
      inputUnitLabel = parseFloat(inputValue) > 1 ? "hrs" : "hr";
    } else {
      inputUnitLabel = parseFloat(inputValue) > 1 ? "sec" : "sec";
    }
    if (
      (parseFloat(inputValue) >= 10 &&
        parseFloat(inputValue) < 60 &&
        unit === TimeUnit.MINUTES) ||
      (parseFloat(inputValue) === Math.floor(parseFloat(inputValue)) &&
        unit === TimeUnit.HOURS) ||
      (parseFloat(inputValue) < 10 &&
        parseFloat(inputValue) === Math.floor(parseFloat(inputValue)) &&
        unit === TimeUnit.MINUTES) ||
      unit === TimeUnit.SECONDS
    ) {
      //Since we only want to showcase time label when the minutes value is bigger than 60 otherwise we'll get something like 45mins(45mins) which is not good, and for the other condition where we are checking if the value is in decimal or not, because if its not in decimal then we don't need to show the time label since it will be shown in the input field itself, and for the last condition we don't want time label if the value is less than 10 and is in decimal and unit is minutes
      isNeedOfTimeLabel = false;
    }
    return `${parseFloat(inputValue)} ${inputUnitLabel} ${
      isNeedOfTimeLabel ? `(${getTimeLabel(timeInMinutes)})` : ``
    }`;
  }

  function generateTimeSuggestions() {
    if (inputValue.length > 0) {
      let inputValueInNumber = parseFloat(inputValue);
      if (isNaN(inputValueInNumber)) inputValue = "";
      //this won't be true for cases in which the string starts with a number(e.g 1h, 1m, 1s)
      // if (inputValue.includes(":")) {
      //   const timeInArray = inputValue.split(":");
      //   if (parseInt(timeInArray[1]) < 60 && parseInt(timeInArray[1]) > 0) {
      //     const timeUnits =
      //       parseInt(timeInArray[0]) + parseInt(timeInArray[1]) / 60;
      //     if (parseInt(timeInArray[0]) < 60) {
      //       return (timeSuggestions = [
      //         {
      //           label: getTimeLabel(timeUnits * 60),
      //           value: timeUnits * 60,
      //           unit: TimeUnit.HOURS,
      //         },
      //         {
      //           label: getTimeLabel(timeUnits),
      //           value: timeUnits,
      //           unit: TimeUnit.MINUTES,
      //         },
      //       ]);
      //     }
      //   }
      // } This functionality is working but since it is changing the input no click or enter, the value in the input field is changing and which is not a good UX, so we are not using this functionality
      else if (inputValueInNumber === 0) return (timeSuggestions = []);
      else if (inputValueInNumber < 0) {
        inputValueInNumber = 0;
        timeSuggestions = [];
      } else if (inputValue.includes("h")) {
        selectedIndex = 0; //Since we are only showing one time suggestion and the input is very specific, so we are selecting the first time suggestion by default
        timeSuggestions = [
          {
            label: getTimeLabelAlongWithTimeMentionedInTheInputField(
              inputValueInNumber * 60,
              TimeUnit.HOURS
            ),
            value: inputValueInNumber * 60,
            unit: TimeUnit.HOURS,
          },
        ];
      } else if (inputValue.includes("m")) {
        selectedIndex = 0; //Since we are only showing one time suggestion and the input is very specific, so we are selecting the first time suggestion by default
        timeSuggestions = [
          {
            label: getTimeLabelAlongWithTimeMentionedInTheInputField(
              inputValueInNumber,
              TimeUnit.MINUTES
            ),
            value: inputValueInNumber,
            unit: TimeUnit.MINUTES,
          },
        ];
      } else if (inputValue.includes("s")) {
        selectedIndex = 0; //Since we are only showing one time suggestion and the input is very specific, so we are selecting the first time suggestion by default
        timeSuggestions = [
          {
            label: getTimeLabelAlongWithTimeMentionedInTheInputField(
              inputValueInNumber,
              TimeUnit.SECONDS
            ),
            value: inputValueInNumber / 60,
            unit: TimeUnit.SECONDS,
          },
        ];
      } else if (inputValueInNumber < 10) {
        selectedIndex = -1;
        timeSuggestions = [
          {
            label: getTimeLabelAlongWithTimeMentionedInTheInputField(
              inputValueInNumber * 60,
              TimeUnit.HOURS
            ), // Since the value is in minutes, we need to showcase hours so we are assuming that user is entering hours but the value parameter is in minutes always, so we need to multiply it by 60
            value: inputValueInNumber * 60,
            unit: TimeUnit.HOURS,
          },
          {
            label: getTimeLabelAlongWithTimeMentionedInTheInputField(
              inputValueInNumber,
              TimeUnit.MINUTES
            ),
            value: inputValueInNumber,
            unit: TimeUnit.MINUTES,
          },
        ];
      } else {
        selectedIndex = -1;
        timeSuggestions = [
          {
            label: getTimeLabelAlongWithTimeMentionedInTheInputField(
              inputValueInNumber,
              TimeUnit.MINUTES
            ),
            value: inputValueInNumber,
            unit: TimeUnit.MINUTES,
          },
        ];
      }
    }
  }

  function resetTimeSuggestions() {
    timeSuggestions = [];
    selectedIndex = -1;
  }

  function handleClickOnTimeSuggestion(index: number) {
    return () => {
      selectedIndex = index;
      value = timeSuggestions[index].value;
      if (currentTimeUnit !== timeSuggestions[index].unit) {
        currentTimeUnit = timeSuggestions[index].unit;
      }

      if (currentTimeUnit === TimeUnit.MINUTES) inputValue = value.toString();
      //there is no need of setting this, since we are actually getting the value from this, but this is like a safety mechanism to make sure the code doesn't break, since if the inputValue changes we'll know that something is wrong
      else if (currentTimeUnit === TimeUnit.HOURS)
        inputValue = (value / 60).toString();
      else inputValue = Math.round(value * 60).toString();

      resetTimeSuggestions();
    };
  }

  function handleKeyDown(event: KeyboardEvent) {
    const numberedInputValue = parseFloat(inputValue);

    if (event.key === "Enter") {
      if (selectedIndex === -1) {
        if (numberedInputValue === 0 || isNaN(numberedInputValue)) value = 0;
        else if (currentTimeUnit === TimeUnit.MINUTES)
          value = numberedInputValue;
        else if (currentTimeUnit === TimeUnit.HOURS)
          value = numberedInputValue * 60;
        else value = numberedInputValue / 60;
      } else {
        handleClickOnTimeSuggestion(selectedIndex)();
      }
      resetTimeSuggestions();
      dispatch("enter", { value });
    } else if (event.key === "ArrowDown") {
      selectedIndex = Math.min(selectedIndex + 1, timeSuggestions.length - 1);
    } else if (event.key === "ArrowUp") {
      selectedIndex = Math.max(selectedIndex - 1, -1);
    } else if (event.key === "Escape") {
      resetTimeSuggestions();
    }
    resetChangeTimer();
  }

  $: {
    if (changeElapsedTime > 1) {
      isShowSaveFeedback = true;
      setTimeout(() => {
        isShowSaveFeedback = false;
        changeElapsedTime = 0;
        clearTimeout(changeTimer);
      }, 2000);
    }
  }

  //To close the dropdown when clicked outside
  appEvents.subscribe((x: AppEventType) => {
    if (
      x.event === AppEvent.WINDOW_CLICKED &&
      x.value &&
      x.value instanceof PointerEvent
    ) {
      actIfClickedOutside(x.value, `#${inputContainerId}`, () => {
        resetTimeSuggestions();
        // timeSuggestions.length > 0 && handleClickOnTimeSuggestion(0)(); // To select the first time suggestion, if present any (in the case of focusout)
      });
    }
  });
</script>

<div id={inputContainerId} class="relative w-full">
  <input
    class={inputClasses}
    bind:value={inputValue}
    on:change
    on:keydown={handleKeyDown}
    on:keyup
    on:blur
    on:focus={generateTimeSuggestions}
    on:focusout
    on:input={onChange}
    {placeholder}
    disabled={isDisabled}
    bind:this={inputRef}
  />
  <div
    class="units-dropdown absolute bg-bgs2 top-[calc(100%+2px)] -left-[2px] w-[calc(100%+4px)] rounded-sm flex flex-col gap-1 z-20"
  >
    {#if timeSuggestions && timeSuggestions.length > 0}
      {#each timeSuggestions as timeSuggestion, index}
        <TimeSuggestionsItem
          isActive={selectedIndex === index}
          on:click={handleClickOnTimeSuggestion(index)}
          >{timeSuggestion.label}</TimeSuggestionsItem
        >
      {/each}
    {/if}
  </div>
</div>

<!-- Note: we have used parseFloat() instead of Number() because we want to use string in the input field as well(characters like 's','m','h'), and if we were to use Number then we would get NaN but we want the numerical part, which is possible in parseFloat -->
