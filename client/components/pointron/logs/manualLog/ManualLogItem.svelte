<script lang="ts">
  import { swipeLabel } from "$lib/client/components/pointron/local.store";
  import { Item } from "$lib/client/types/item.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { attachTimeToDate, formatTime } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import DurationSuggestions from "./DurationSuggestions.svelte";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { userPreferences } from "$lib/client/stores/app.store";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import DurationInput from "$lib/client/elements/input/durationInput/DurationInput.svelte";
  import { pointLogStore } from "../log.store";
  import TimeInput from "$lib/client/elements/datetime/TimeInput.svelte";
  import type { IManualSessionLogForm } from "../log.type";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import FocusNotes from "../../focus/notes/FocusNotes.svelte";
  export let item: IManualSessionLogForm;
  let label: string = "";
  let selectedGoal: any = undefined;
  let inputRef: any;
  let selectedQuickAddItem: number = 0;
  if (item.goalId !== "") selectedGoal = { label: $swipeLabel };
  onMount(() => {
    setTimeout(() => {
      if (inputRef) inputRef.focus();
    }, 100);
  });
  function onGoalSelect(event: any) {
    selectedGoal = event?.detail?.item;
    item.goalId = selectedGoal.id;
    label = "";
  }
  function onQuickDurationSelected(event: any) {
    item.duration = event?.detail * 60;
    refreshStartTime();
  }
  function onGoalClicked() {
    selectedGoal = undefined;
    setTimeout(() => {
      inputRef.focus();
    }, 100);
    // inputRef.focus();
  }
  function onTimeChange(event: any) {
    let start: Date;
    let end: Date;
    start = attachTimeToDate(item.startDate, item.startTime);
    end = attachTimeToDate(item.endDate, item.endTime);
    item.duration = (end.getTime() - start.getTime()) / 1000;
  }
  function refreshStartTime() {
    const startTime = new Date(new Date().getTime() - item.duration * 1000);
    item.startTime = formatTime($userPreferences, startTime, "24")!;
  }
  function ondurationchange(event: any) {
    selectedQuickAddItem = 0;
    refreshStartTime();
  }
</script>

<div
  class="relative flex flex-col gap-6 border border-brs2 py-8 px-4 xl:px-4 xl:py-6 rounded-md w-full"
>
  {#if $pointLogStore.manualLogs.length > 1}
    <div class="absolute bg-bgs1 right-1 -top-3">
      <Button
        icon="minus-circled"
        size={Size.xs}
        type={ButtonVariant.DANGER}
        style={ButtonStyle.OUTLINED}
        label="Remove"
        on:click={() => pointLogStore.removeManualLog(item.id)}
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
      searchStoreId={Item.PointGoal}
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
  <FocusNotes bind:md={item.notes} />
</div>
