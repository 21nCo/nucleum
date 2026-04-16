<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { generateUID } from "@21n/utils/utils";
  import { pointronPreferences } from "@21n/products/pointron/pointron.store";
  import {
    SessionCompositionType,
    type SessionComposition,
    BreakCompositionType
  } from "@21n/types/pointron/sessionComposition.type";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "@21n/types/switcher.enum";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import { getTotalsFromComposition } from "@21n/products/pointron/pointron.utils";
  import DurationInput from "@21n/elements/input/durationInput/DurationInput.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import PomodoroUnitView from "@21n/products/pointron/focus/advanced/presets/PomodoroUnitView.svelte";
  import ComposeBreak from "@21n/products/pointron/focus/advanced/composition/ComposeBreak.svelte";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import { Size } from "@21n/types/size.enum";
  import { ButtonStyle } from "@21n/types/button.type";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import { appStore } from "@21n/stores/app.store";
  import Divider from "@21n/elements/Divider.svelte";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
  let {
    composition = $bindable(),
    isShowSave = false,
    parentBgIndex = 1,
    onChange = undefined
  }: {
    composition: SessionComposition;
    isShowSave?: boolean;
    parentBgIndex?: number;
    onChange?: ((event: CustomEvent<SessionComposition>) => void) | undefined;
  } = $props();
  let isTargetFocus: boolean =
    composition.type === SessionCompositionType.TARGET_FOCUS;

  let selectedType: string =
    composition.type === SessionCompositionType.POMODORO
      ? "Pomodoro"
      : composition.type === SessionCompositionType.COUNTUP
        ? "Countup"
        : "Countdown";
  if (composition.type === SessionCompositionType.SLIDER)
    composition.type = SessionCompositionType.TOTAL_DURATION;

  function generateSeedPomodoroRound() {
    const id = generateSimpleRandomId();
    return {
      id,
      type: SessionCompositionType.POMODORO,
      numberOfFocusRounds: 2,
      focusDuration: 28 * 60,
      breakDuration: 2 * 60,
      totalDuration: 0,
      numberOfBreaks: 1,
      breakReminder: 0,
      breakType: BreakCompositionType.PREDEFINED
    };
  }

  let totals = $derived(getTotalsFromComposition({ composition }));

  function emitChange() {
    const changeEvent = new CustomEvent<SessionComposition>("change", {
      detail: composition
    });
    onChange?.(changeEvent);
  }

  function removeAdditionalHandler(event: any) {
    composition.additional = composition.additional?.filter(
      (x) => x.id !== event?.detail?.preset?.id
    );
    emitChange();
  }
  function onAddAdditionalClicked() {
    composition.additional = [
      ...(composition.additional ?? []),
      generateSeedPomodoroRound()
    ];
    emitChange();
  }
  function onEachAdditionalEdit(item: SessionComposition) {
    if (!item) return;
    let presetToBeSaved = { ...item };
    if (presetToBeSaved?.id !== composition.id) {
      composition.additional = composition.additional?.filter(
        (x) => x.id !== presetToBeSaved.id
      );
      composition.additional = [
        ...(composition.additional ?? []),
        presetToBeSaved
      ];
      emitChange();
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
      pointronPreferences.removePreset(composition.id);
  }
</script>

<div class="flex flex-col items-center flex-grow w-full my-2 gap-4">
  <PanelSwitcher
    items={["Countup", "Countdown", "Pomodoro"]}
    size={Size.sm}
    bind:value={selectedType}
    style={PanelSwitcherStyle.BAR}
    isExpandToFullWidth={isShowSave}
    barStyle={BarStyle.EXACT}
    {parentBgIndex}
    onSwitch={() => {
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
      emitChange();
    }}
  >
    {#snippet right()}
      {#if isShowSave}
        <Button
          icon="bookmark"
          onclick={() => {
            appStore.runAction(PointronAction.SAVE_PRESET_MODAL);
          }}
          tooltip="Save as preset"
        />
      {/if}
    {/snippet}
  </PanelSwitcher>
  <div class="flex flex-col w-full flex-grow gap-8">
    {#if composition.type === SessionCompositionType.POMODORO}
      <div class="flex flex-col gap-6 items-center h-96 overflow-y-auto">
        <PomodoroUnitView bind:composition onChange={emitChange} />
        {#if composition.additional && composition.additional.length > 0}
          {#each composition.additional as item}
            <PomodoroUnitView
              composition={item}
              onRemove={removeAdditionalHandler}
              onChange={() => onEachAdditionalEdit(item)}
              isShowRemove={true}
            />
          {/each}
        {/if}
        <div class="mb-40">
          <Button
            onclick={onAddAdditionalClicked}
            style={ButtonStyle.OUTLINED}
            size={Size.sm}
            icon="plus"
            label="add another round"
          />
        </div>
      </div>
    {:else}
      <div class="flex flex-col gap-6 h--96 overflow-y-auto">
        {#if composition.type != SessionCompositionType.COUNTUP}
          {#if composition.type !== SessionCompositionType.TARGET_FOCUS}
            <DurationInput
              bind:value={composition.totalDuration}
              label={{
                label: "Total duration",
                orientation: Orientation.Vertical
              }}
              onChange={emitChange}
            />
          {:else if composition.type === SessionCompositionType.TARGET_FOCUS}
            <DurationInput
              bind:value={composition.focusDuration}
              label={{
                label: "Focus target duration",
                orientation: Orientation.Vertical
              }}
              onChange={emitChange}
            />{/if}
          <SwitchInput
            bind:checked={isTargetFocus}
            isExpanded={true}
            label={{
              label: "Adjust end time until target is reached",
              tooltip: {
                body: "Once you start the session, if you take breaks in between, the end time will be auto adjusted until you reach the target duration entered above. Turn this off to keep the end time fixed."
              }
            }}
            onChange={(e) => {
              if (e?.detail) {
                composition.type = SessionCompositionType.TARGET_FOCUS;
                composition.focusDuration = composition.totalDuration;
              } else {
                composition.type = SessionCompositionType.TOTAL_DURATION;
              }
              emitChange();
            }}
          />
          <Divider />
        {/if}
        <ComposeBreak
          {composition}
          isDisablePredefined={composition.type ===
            SessionCompositionType.COUNTUP}
          onChange={emitChange}
        />
        <ScrollViewBottomSpacer />
      </div>
    {/if}
  </div>
</div>
