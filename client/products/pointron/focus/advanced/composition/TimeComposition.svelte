<script lang="ts">
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import Slider from "@21n/products/pointron/focus/advanced/slider/Slider.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { Size } from "@21n/types/size.enum";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import AdvancedFocusModeSwitcher from "@21n/products/pointron/focus/advanced/modeSwitcher/AdvancedFocusModeSwitcher.svelte";
  import ComposeDuration from "@21n/products/pointron/focus/advanced/composition/ComposeDuration.svelte";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import {
    PanelSwitcherActiveItemStrength,
    PanelSwitcherStyle
  } from "@21n/types/switcher.enum";
  import PresetPicker from "@21n/products/pointron/focus/advanced/composition/PresetPicker.svelte";
  import { onMount } from "svelte";
  import { SessionCompositionType } from "@21n/types/pointron/sessionComposition.type";
  import Icon from "@21n/elements/Icon.svelte";
  import ComposeTotalsText from "@21n/products/pointron/focus/advanced/composition/ComposeTotalsText.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import {
    UIState,
    UIStateScope
  } from "@21n/stores/uiState/uiState.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { deepCopy } from "@21n/shared-utils/obj.utils";
  import { logger } from "@21n/components/debug/logger.client";
  import { cn } from "@21n/utils/ui.utils";

  export let parentBgIndex: number = 1;
  let selectedMode: number = refreshAdvancedModeState();
  let selectedDynamicDuration: number = 0;
  let isSliderVariant: boolean = false;
  function onDynamicSliderChange(event: any) {
    if (
      $activeSession.isSessionRunning ||
      $activeSession.preventSliderReverseEventTemp
    )
      return;
    selectedDynamicDuration = Number(event.detail.value);
    activeSession.onSliderDurationChange(selectedDynamicDuration);
  }
  function onCompositionChanges() {
    logger.log({
      at: "onCompositionChanges",
      composition: deepCopy($activeSession.composition)
    });
    activeSession.onComposeComplete();
  }
  function onModeSwitch(event: any) {
    console.log({ event });
    selectedMode = event.detail === "Presets" ? 0 : 1;
    uiState.setState(UIState.focusAdvancedComposeMode, selectedMode, {
      scope: UIStateScope.DEVICE
    });
  }
  onMount(() => {
    const userPreferencesUnsub = userPreferences.subscribe(() => {
      selectedMode = refreshAdvancedModeState();
    });

    return () => {
      userPreferencesUnsub();
    };
  });

  function refreshAdvancedModeState() {
    return uiState.getState(UIState.focusAdvancedComposeMode, {
      scope: UIStateScope.DEVICE
    });
  }
</script>

<div
  class={cn(
    "relative flex flex-col items-center rounded-lg w-full justify-start gap-4 flex-grow"
  )}
>
  {#if !isSliderVariant}
    <div class="flex flex-col items-center w-full gap-4 dp:gap-8">
      <ComposeTotalsText
        composition={$activeSession.composition}
        {parentBgIndex}
      />
      {#if $activeSession.composition.type !== SessionCompositionType.END_TIME_FIXED}
        <div class="flex w-full justify-center">
          <PanelSwitcher
            style={PanelSwitcherStyle.TRAIN}
            {parentBgIndex}
            items={["Presets", "Custom"]}
            value={selectedMode === 0 ? "Presets" : "Custom"}
            on:switch={onModeSwitch}
            activeItemStrength={PanelSwitcherActiveItemStrength.SUBTLE}
          />
          <!-- <AdvancedFocusModeSwitcher bind:selectedMode /> -->
        </div>
      {/if}
    </div>
    {#if selectedMode == 0}
      <PresetPicker parentBackgroundIndex={parentBgIndex} />
    {:else if $activeSession.composition.type === SessionCompositionType.END_TIME_FIXED}
      <!-- TODO -->
      <div class="py-8 flex flex-col items-center gap-4">
        <div class="flex flex-col gap-2 items-center">
          <Icon icon="clock" />
          <div class="text-fgs2">End time selected.</div>
        </div>
        <Button
          label="Clear"
          size={Size.sm}
          icon="cross"
          on:click={() => {
            activeSession.resetComposition();
          }}
        />
      </div>
    {:else}
      <ComposeDuration
        {parentBgIndex}
        bind:composition={$activeSession.composition}
        on:change={onCompositionChanges}
        isShowSave={true}
      />
    {/if}
  {:else}
    <div class="flex flex-col px-4 gap-8">
      <div class="h-32">
        {#if selectedMode == 0}
          <PresetPicker parentBackgroundIndex={parentBgIndex} />
        {:else}
          <div class="relative flex flex-col gap-2 max-w-[19rem]">
            <Slider
              parentBackgroundIndex={parentBgIndex}
              on:time-change={onDynamicSliderChange}
            />
            <div class="flex justify-center w-full">
              <Button
                label="compose"
                size={Size.xs}
                parentBgIndex={2}
                on:click={() => {
                  appStore.runAction(PointronAction.COMPOSE_TIME_MODAL);
                }}
              />
            </div>
          </div>
          <!-- <TimeleftIndicator /> -->
        {/if}
      </div>
    </div>
    <AdvancedFocusModeSwitcher {selectedMode} on:switch={onModeSwitch} />
  {/if}
</div>
