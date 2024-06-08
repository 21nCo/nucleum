<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { generateUID } from "$lib/client/utils/utils";
  import { userLocalPreferences } from "$lib/client/components/pointron/local.store";
  import {
    SessionCompositionType,
    type SessionComposition,
    BreakCompositionType
  } from "$lib/client/types/pointron/sessionComposition.type";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { getTotalsFromComposition } from "$lib/client/components/pointron/local.utils";
  import DurationInput from "$lib/client/elements/input/durationInput/DurationInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import PomodoroUnitView from "../presets/PomodoroUnitView.svelte";
  import ComposeBreak from "./ComposeBreak.svelte";
  import { createEventDispatcher } from "svelte";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import Divider from "$lib/client/elements/Divider.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  const dispatch = createEventDispatcher();
  export let composition: SessionComposition;
  export let isShowSave: boolean = false;
  let isTargetFocus: boolean = false;
  let selectedType: string =
    composition.type === SessionCompositionType.POMODORO
      ? "Pomodoro"
      : composition.type === SessionCompositionType.COUNTUP
        ? "Countup"
        : "Countdown";
  //let method: SessionCompositionType = composition.type ?? 0;
  //console.log({ method });
  // $: {
  //   if ($sessionStore.composition?.type === SessionCompositionType.SLIDER) {
  //     method = SessionCompositionType.TOTAL_DURATION;
  //   }
  // }
  if (composition.type === SessionCompositionType.SLIDER)
    composition.type = SessionCompositionType.TOTAL_DURATION;
  let seedPomodoroRound: SessionComposition = {
    id: generateUID(),
    type: SessionCompositionType.POMODORO,
    numberOfFocusRounds: 2,
    focusDuration: 28 * 60,
    breakDuration: 2 * 60,
    totalDuration: 0,
    numberOfBreaks: 1,
    breakReminder: 0,
    breakType: BreakCompositionType.PREDEFINED
  };
  let totals = getTotalsFromComposition({ composition });
  // $: console.log({ composition });

  function removeAdditionalHandler(event: any) {
    composition.additional = composition.additional?.filter(
      (x) => x.id != event?.detail?.preset.id
    );
  }
  function onAddAdditionalClicked() {
    composition.additional = [
      ...(composition.additional ?? []),
      seedPomodoroRound
    ];
  }
  function onEachAdditionalEdit(event: any) {
    let presetToBeSaved = event.detail.preset;
    if (presetToBeSaved.id != composition.id) {
      removeAdditionalHandler(event);
      composition.additional = [
        ...(composition.additional ?? []),
        event.detail.preset
      ];
    }
  }
  function saveHandler() {
    // if (id) {
    //   userLocalPreferences.updatePreset(composition);
    // } else {
    //   userLocalPreferences.addPreset(composition);
    // }
  }
  function deleteHandler() {
    if (composition && composition.id)
      userLocalPreferences.removePreset(composition.id);
  }
</script>

<div class="flex flex-col flex-grow w-full my-2 gap-8">
  <div class="w-full flex {isShowSave ? 'justify-between' : 'justify-center'}">
    <PanelSwitcher
      items={["Countup", "Countdown", "Pomodoro"]}
      size={Size.sm}
      bind:value={selectedType}
      style={PanelSwitcherStyle.BAR}
      on:switch={() => {
        if (selectedType === "Pomodoro") {
          composition.type = SessionCompositionType.POMODORO;
          if (!composition.numberOfFocusRounds) {
            composition.numberOfFocusRounds = 1;
          }
          composition.breakType = BreakCompositionType.PREDEFINED;
          // composition.type = SessionCompositionType.POMODORO;
        } else if (selectedType === "Countdown") {
          composition.type = SessionCompositionType.TOTAL_DURATION;
          if (!composition.numberOfBreaks) composition.numberOfBreaks = 0;
          if (!composition.breakDuration) composition.breakDuration = 0;
          composition.totalDuration = totals.duration;
          // numberOfBreaksInput = composition.numberOfFocusRounds - 1;
          // breakInput = composition.breakDuration;
          // composition.type = SessionCompositionType.TOTAL_DURATION;
        } else if (selectedType === "Countup") {
          composition.type = SessionCompositionType.COUNTUP;
          composition.breakType = BreakCompositionType.REMINDER;
        }
        dispatch("change", composition);
      }}
    />
    {#if isShowSave}
      <Button
        icon="bookmark"
        on:click={() => {
          appStore.runAction(PointronEventEnum.SAVE_PRESET_MODAL);
        }}
        tooltip="Save as preset"
      />
    {/if}
  </div>
  <div class="flex flex-col flex-grow gap-8">
    {#if composition.type === SessionCompositionType.POMODORO}
      <div class="flex flex-col gap-2 items-center h-96 overflow-y-auto">
        <PomodoroUnitView bind:composition on:change />
        {#if composition.additional && composition.additional.length > 0}
          {#each composition.additional as item}
            <PomodoroUnitView
              composition={item}
              on:remove={removeAdditionalHandler}
              on:change={onEachAdditionalEdit}
              isShowRemove={true}
            />
          {/each}
        {/if}
        <div class="mb-40">
          <Button
            on:click={onAddAdditionalClicked}
            style={ButtonStyle.OUTLINED}
            label="add another round"
          />
        </div>
      </div>
      <!-- {:else if composition.type === SessionCompositionType.TARGET_FOCUS}
      <DurationInput
        bind:value={composition.focusDuration}
        label="Target focus"
        info={{
          body: "The target duration that you want to focus for"
        }}
        labelOrientation={Orientation.Horizontal}
        on:change
      /> -->
    {:else}
      <div class="flex flex-col gap-6 h-96 overflow-y-auto">
        {#if composition.type != SessionCompositionType.COUNTUP}
          <DurationInput
            bind:value={composition.totalDuration}
            label={{
              label: "Total duration",
              orientation: Orientation.Vertical
            }}
            on:change
          />
          <SwitchInput
            bind:checked={isTargetFocus}
            label={{
              label: "Adjust end time until target is reached",
              tooltip: {
                body: "If you take breaks in between, the end time will be auto adjusted until you reach the target duration entered above. Turn this off to keep the end time fixed."
              }
            }}
          />
          <Divider />
        {/if}
        <ComposeBreak
          {composition}
          isDisablePredefined={composition.type ===
            SessionCompositionType.COUNTUP ||
            composition.type === SessionCompositionType.TARGET_FOCUS}
          on:change
        />
        <ScrollViewBottomSpacer />
      </div>
    {/if}
  </div>
</div>
