<script lang="ts">
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
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
  import { SearchStore } from "$lib/client/components/record/record.store";
  import GoalSearchResultItem from "$lib/client/components/goals/GoalSearchResultItem.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import Divider from "$lib/client/elements/Divider.svelte";
  import {
    GoalStatus,
    type IGoal
  } from "$lib/client/components/goals/goal.type";
  import { goalStore } from "$lib/client/components/goals/goal.store";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { resolveGoalColor } from "$lib/client/components/goals/goal.utils";
  import {
    removeDuplicatesFilter,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import view from "$lib/client/stores/view.store";
  export let item: IManualSessionLogForm;

  let previousStartDate: Date = item.startDate;
  let previousEndDate: Date = item.endDate;
  let previousStartTime: string = item.startTime;
  let previousEndTime: string = item.endTime;
  let lastActionPerformed: LastActionPerformed | null = null;
  let label: string = "";
  let selectedGoal: any = undefined;
  let inputRef: any;
  let selectedQuickAddItem: number = resolveQuickAddSelection();
  let error: string = "";
  let defaultTime = Date.now();
  let selectedMethod: "duration" | "startEnd" =
    uiState.getState(UIState.manualLogDurationMethod, {
      isProductScoped: true,
      isDeviceScoped: true
    }) ?? "duration";
  const searchStore = new SearchStore(Resource.goal);
  let recentGoals: IGoal[] = [];

  onMount(() => {
    resolveRecentGoals();
    onQuickDurationSelectDelegate(selectedQuickAddItem, true);
    setTimeout(() => {
      if (inputRef) inputRef.focus();
    }, 100);
    return () => {
      $isPrimaryActionDisabled = false;
    };
  });

  async function resolveRecentGoals() {
    const state = uiState.getState(UIState.manualLogRecentGoals);
    if (state) {
      const result = await goalStore.selectMany(
        {
          filters: {
            id: state
          }
        },
        {
          isExpand: true
        }
      );
      if (result) {
        recentGoals = state
          .map((x) => result.find(resourceInList(x)))
          .slice(0, $view.isConstrainedWidth ? 3 : 5);
      }
    }
  }

  function resolveQuickAddSelection() {
    const state = uiState.getState(UIState.manualLogQuickDuration, {
      isProductScoped: true,
      isDeviceScoped: true
    });
    return state ?? $pointronPreferences?.manualEntryQuickDurations?.[0] ?? 10;
  }

  function onGoalSelect(goal: IGoal) {
    selectedGoal = goal;
    addToRecentGoals(goal);
    item.goalId = goal.id;
    label = "";
    performValidationChecks();
  }

  function addToRecentGoals(goal: IGoal) {
    uiState.setState(
      UIState.manualLogRecentGoals,
      [goal.id, ...(uiState.getState(UIState.manualLogRecentGoals) ?? [])]
        .filter(removeDuplicatesFilter)
        .slice(0, 5)
    );
  }

  function onQuickDurationSelected(event: any) {
    onQuickDurationSelectDelegate(event?.detail);
  }

  function onQuickDurationSelectDelegate(
    duration: number,
    isPreventValidation: boolean = false
  ) {
    item.duration = duration * 60;
    item.endDate = new Date(defaultTime);
    item.endTime = formatTime($userPreferences, item.endDate, {
      format: "24"
    })!;
    updateStartTimeWRTDuration();
    if (!isPreventValidation)
      performValidationChecks("onQuickDurationSelected");
  }

  function onGoalClicked() {
    selectedGoal = undefined;
    resolveRecentGoals();
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
    performValidationChecks("onTimeChange");
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

  function onDurationChange(event: any) {
    item.duration = event?.detail?.value;
    selectedQuickAddItem = 0;
    if (lastActionPerformed === LastActionPerformed.START_TIME_CHANGED)
      updateEndTimeWRTDuration();
    else updateStartTimeWRTDuration();
    lastActionPerformed = LastActionPerformed.DURATION_CHANGED;
    performValidationChecks("ondurationchange");
  }

  function performValidationChecks(src?: string) {
    // console.log({ src, item });
    if (selectedMethod === "duration") {
      if (item.duration <= 0) {
        error = "Duration should be greater than 0.";
        $isPrimaryActionDisabled = true;
        return;
      }
    } else {
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
    }

    if (selectedGoal === undefined) {
      error = "Please select a goal";
      $isPrimaryActionDisabled = true;
      return;
    }
    error = "";
    $isPrimaryActionDisabled = false;
  }

  async function searchCallback(searchQuery: string) {
    const result = await searchStore.select({
      searchQuery,
      isIncludeSubItems: true,
      filters: {
        status: {
          notEquals: GoalStatus.COMPLETED
        }
      }
    });
    return result;
  }
</script>

<div
  class="relative flex flex-col gap-12 border border-brs2 py-8 xl:py-6 rounded-md w-full"
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
        on:click={() => manualLogStore.remove(item.id)}
      />
    </div>
  {/if}

  <div class="flex flex-col gap-4 px-4 xl:px-4">
    {#if selectedGoal}
      <div
        class="flex justify-start w-full py-2 border border-bgs4 px-2 rounded-md"
      >
        <CustomColorPropagator
          color={resolveGoalColor(selectedGoal)}
          class="flex justify-between items-center w-full text-ccs1"
          on:click={onGoalClicked}
        >
          {selectedGoal.label}
          <Button icon="ph:x-light" />
        </CustomColorPropagator>
      </div>
    {:else}
      <TextSearchInput
        on:focus
        on:blur
        on:select={(e) => onGoalSelect(e?.detail?.item)}
        bind:value={label}
        bind:this={inputRef}
        searchResultComponent={GoalSearchResultItem}
        {searchCallback}
        style={InputStyle.BORDERED}
        placeholder="Start typing to select goal"
      />
      {#if recentGoals && recentGoals.length > 0}
        <div class="flex items-center flex-wrap gap-3">
          <span class="text-b2 text-fgs3"> Recently used: </span>
          {#each recentGoals as goal}
            <CustomColorPropagator
              color={resolveGoalColor(goal)}
              class="flex items-center gap-2 border border-ccs1 rounded-md px-2 py-1 text-ccs1 bg-ccs5 hover:bg-ccs4"
              on:click={() => {
                onGoalSelect(goal);
              }}
            >
              {goal.label}
            </CustomColorPropagator>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
  <div class="flex flex-col gap-6">
    <div class="flex justify-start">
      <PanelSwitcher
        items={[
          { label: "Duration", value: "duration" },
          { label: "Start and End", value: "startEnd" }
        ]}
        style={PanelSwitcherStyle.BAR}
        barStyle={BarStyle.EXACT}
        isExpandToFullWidth={true}
        size={Size.sm}
        bind:value={selectedMethod}
        on:switch={() => {
          uiState.setState(UIState.manualLogDurationMethod, selectedMethod, {
            isProductScoped: true,
            isDeviceScoped: true
          });
        }}
      />
    </div>

    <div class="flex flex-col gap-6 px-4 xl:px-4">
      {#if selectedMethod === "duration"}
        <div class="w-full max-w-full">
          <DurationSuggestions
            on:select={onQuickDurationSelected}
            bind:selectedItem={selectedQuickAddItem}
          />
        </div>
        <div class="flex flex-col items-start w-full gap-2">
          <DurationInput
            label={{
              label: "Or enter manually",
              orientation: Orientation.Vertical
            }}
            value={item.duration}
            on:change={onDurationChange}
          />
        </div>
      {:else}
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
      {/if}
    </div>
  </div>

  <div class="flex flex-col">
    <Divider />
    <div class="px-4 xl:px-4 py-3">
      <FocusNotes
        bind:md={item.notes}
        isHideTitle={true}
        placeholder="Add notes"
      />
    </div>
  </div>
  {#if error}
    <InlineErrorMessage isDissappear={false} bind:error />
  {/if}
</div>
