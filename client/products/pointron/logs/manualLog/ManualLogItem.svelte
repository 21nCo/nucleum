<script lang="ts">
  import { swipeLabel } from "$lib/client/products/pointron/pointron.store";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { formatTime } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import DurationSuggestions from "./DurationSuggestions.svelte";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import DurationInput from "$lib/client/elements/input/durationInput/DurationInput.svelte";
  import { manualLogStore } from "../log.store";
  import TimeInput from "$lib/client/elements/datetime/TimeInput.svelte";
  import { LastActionPerformed, type IManualSessionLogForm } from "../log.type";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import FocusNotes from "../../focus/notes/FocusNotes.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import { isPrimaryActionDisabled } from "$lib/client/components/modal/modal.store";

  import GoalSearchThumbnail from "../../goals/thumbnails/GoalSearchThumbnail.svelte";
  export let item: IManualSessionLogForm;

  let previousStartDate: Date = item.startDate;
  let previousEndDate: Date = item.endDate;
  let previousStartTime: string = item.startTime;
  let previousEndTime: string = item.endTime;
  let lastActionPerformed: LastActionPerformed | null = null;
  let label: string = "";
  let selectedGoal: any = undefined;
  let inputRef: any;
  let selectedQuickAddItem: number = 0;
  let error: string = "";
  let defaultTime = Date.now();

  if (item.goalId !== "") selectedGoal = { label: $swipeLabel };

  onMount(() => {
    selectedQuickAddItem = 10;
    onQuickDurationSelected({ detail: selectedQuickAddItem });
    performValidationChecks();
    setTimeout(() => {
      if (inputRef) inputRef.focus();
    }, 100);
    return () => {
      $isPrimaryActionDisabled = false;
    };
  });
  function onGoalSelect(event: any) {
    selectedGoal = event?.detail?.item;
    item.goalId = selectedGoal.id;
    label = "";
    performValidationChecks();
  }
  function onQuickDurationSelected(event: any) {
    item.duration = event?.detail * 60;
    item.endDate = new Date(defaultTime);
    item.endTime = formatTime($userPreferences, item.endDate, {
      format: "24"
    })!;
    updateStartTimeWRTDuration();
    performValidationChecks();
  }
  function onGoalClicked() {
    selectedGoal = undefined;
    setTimeout(() => {
      inputRef.focus();
    }, 100);
    performValidationChecks();
    // inputRef.focus();
  }
  function setTimeToDate(
    date: Date,
    hours: number,
    minutes: number,
    seconds: number,
    milliseconds: number
  ) {
    const newDate = new Date(date);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(seconds);
    newDate.setMilliseconds(milliseconds);
    return newDate;
  }

  function syncStartAndEndRespectively() {
    item.startDate = setTimeToDate(
      item.startDate,
      Number(item.startTime.split(":")[0]),
      Number(item.startTime.split(":")[1]),
      0,
      0
    );
    item.endDate = setTimeToDate(
      item.endDate,
      Number(item.endTime.split(":")[0]),
      Number(item.endTime.split(":")[1]),
      0,
      0
    );
    previousEndDate = item.endDate;
    previousStartDate = item.startDate;
    previousEndTime = item.endTime;
    previousStartTime = item.startTime;
  }
  function onTimeChange(event: any) {
    let start: Date;
    let end: Date;
    selectedQuickAddItem = 0;
    if (item.startTime === "") {
      item.startDate = previousStartDate;
      item.startTime = previousStartTime;
    }
    if (item.endTime === "") {
      item.endDate = previousEndDate;
      item.endTime = previousEndTime;
    }
    if (
      lastActionPerformed === LastActionPerformed.DURATION_CHANGED &&
      (item.startDate !== previousStartDate ||
        item.startTime !== previousStartTime)
    ) {
      syncStartAndEndRespectively();
      updateEndTimeWRTDuration();
      lastActionPerformed = LastActionPerformed.START_TIME_CHANGED;
      return;
    } else if (
      item.startDate !== previousStartDate ||
      item.startTime !== previousStartTime
    ) {
      lastActionPerformed = LastActionPerformed.START_TIME_CHANGED;
    } else if (
      item.endDate !== previousEndDate ||
      item.endTime !== previousEndTime
    ) {
      lastActionPerformed = LastActionPerformed.END_TIME_CHANGED;
    }
    syncStartAndEndRespectively();
    const duration = (item.endDate.getTime() - item.startDate.getTime()) / 1000;
    if (duration <= 0) {
      item.duration = 0;
    } else
      item.duration =
        (item.endDate.getTime() - item.startDate.getTime()) / 1000;
    performValidationChecks();
  }
  function updateEndTimeWRTDuration() {
    item.endDate = new Date(item.startDate.getTime() + item.duration * 1000);
    item.endTime = formatTime($userPreferences, item.endDate, {
      format: "24"
    })!;
    previousEndDate = item.endDate;
    previousEndTime = item.endTime;
  }
  function updateStartTimeWRTDuration() {
    item.startDate = new Date(item.endDate.getTime() - item.duration * 1000);
    item.startTime = formatTime($userPreferences, item.startDate, {
      format: "24"
    })!;
    previousStartDate = item.startDate;
    previousStartTime = item.startTime;
  }
  function ondurationchange(event: any) {
    selectedQuickAddItem = 0;
    if (lastActionPerformed === LastActionPerformed.START_TIME_CHANGED)
      updateEndTimeWRTDuration();
    else updateStartTimeWRTDuration();
    lastActionPerformed = LastActionPerformed.DURATION_CHANGED;
    performValidationChecks();
  }
  function performValidationChecks() {
    if (item.startDate.getFullYear() < 1971) {
      error = "Please select a valid date. Year should be greater than 1971.";
      $isPrimaryActionDisabled = true;
      return;
    }
    if (item.startDate.getTime() >= item.endDate.getTime()) {
      error = "Start time should be less than end time.";
      $isPrimaryActionDisabled = true;
      return;
    }
    if (item.duration <= 0) {
      error = "Duration should be greater than 0.";
      $isPrimaryActionDisabled = true;
      return;
    }
    if (selectedGoal === undefined) {
      error = "Please select a goal";
      $isPrimaryActionDisabled = true;
      return;
    }
    error = "";
    $isPrimaryActionDisabled = false;
  }
</script>

<div
  class="relative flex flex-col gap-6 border border-brs2 py-8 px-4 xl:px-4 xl:py-6 rounded-md w-full"
>
  {#if $manualLogStore.manualLogs.length > 1}
    <div class="absolute bg-bgs1 right-1 -top-3">
      <Button
        icon="minus-circled"
        size={Size.xs}
        type={ButtonVariant.DANGER}
        style={ButtonStyle.OUTLINED}
        isPreventMinWidth={true}
        label="Remove"
        on:click={() => manualLogStore.removeManualLog(item.id)}
      />
    </div>
  {/if}

  {#if selectedGoal}
    <div
      class="flex justify-start w-full py-2 border border-bgs4 px-2 rounded-md"
    >
      <button
        class="flex justify-between items-center w-full"
        on:click={onGoalClicked}
      >
        {selectedGoal.label}
        <Icon icon="chevdown" />
      </button>
    </div>
  {:else}
    <TextSearchInput
      on:focus
      on:blur
      on:select={onGoalSelect}
      bind:value={label}
      bind:this={inputRef}
      isPreventDefaultResults={true}
      searchResultComponent={GoalSearchThumbnail}
      searchStoreId={Resource.PointGoal}
      style={InputStyle.BORDERED}
      placeholder="Start typing to select goal"
    />
  {/if}

  <div class="w-full max-w-full">
    <DurationSuggestions
      on:select={onQuickDurationSelected}
      bind:selectedItem={selectedQuickAddItem}
    />
  </div>
  <div class="flex flex-col gap-2">
    <FormControlLabel props={{ label: "Start" }} />
    <div class="flex items-center w-full gap-4">
      <DatePicker bind:date={item.startDate} on:change={onTimeChange} />
      <TimeInput bind:value={item.startTime} on:change={onTimeChange} />
    </div>
  </div>
  <div class="flex flex-col gap-2">
    <FormControlLabel props={{ label: "End" }} />
    <div class="flex items-center w-full gap-4">
      <DatePicker bind:date={item.endDate} on:change={onTimeChange} />
      <TimeInput bind:value={item.endTime} on:change={onTimeChange} />
    </div>
  </div>

  <div class="flex flex-col items-start w-full gap-2">
    <DurationInput
      label={{ label: "Duration", orientation: Orientation.Vertical }}
      bind:value={item.duration}
      on:change={ondurationchange}
    />
  </div>
  <div class="p-2 bg-bgs2 rounded-md">
    <FocusNotes bind:md={item.notes} />
  </div>
  <InlineErrorMessage isDissappear={false} bind:error />
</div>
