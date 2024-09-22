<script lang="ts">
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import Slider from "../slider/Slider.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import AdvancedFocusModeSwitcher from "../modeSwitcher/AdvancedFocusModeSwitcher.svelte";
  import ComposeDuration from "./ComposeDuration.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import PresetPicker from "./PresetPicker.svelte";
  import { onMount } from "svelte";
  import { SessionCompositionType } from "$lib/client/types/pointron/sessionComposition.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import ComposeTotalsText from "./ComposeTotalsText.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { deepCopy } from "$lib/shared/utils/obj.utils";
  import { logger } from "$lib/client/components/debug/logger.client";
  export let isExpandedMode: boolean = true;
  let selectedMode: number = refreshAdvancedModeState();
  let selectedDynamicDuration: number = 0;
  $: parentBackgroundIndex = isExpandedMode ? 1 : 2;
  function onDynamicSliderChange(event: any) {
    if (
      $sessionStore.isSessionRunning ||
      $sessionStore.preventSliderReverseEventTemp
    )
      return;
    selectedDynamicDuration = Number(event.detail.value);
    sessionStore.onSliderDurationChange(selectedDynamicDuration);
  }
  function onCompositionChanges() {
    logger.log({
      at: "onCompositionChanges",
      composition: deepCopy($sessionStore.composition)
    });
    sessionStore.onComposeComplete();
  }
  function onModeSwitch(event: any) {
    console.log({ event });
    selectedMode = event.detail === "Presets" ? 0 : 1;
    uiState.setState(UIState.focusAdvancedComposeMode, selectedMode, {
      isDeviceScoped: true
    });
  }
  onMount(() => {
    userPreferences.subscribe((value) => {
      selectedMode = refreshAdvancedModeState();
    });
  });

  function refreshAdvancedModeState() {
    return uiState.getState(UIState.focusAdvancedComposeMode, {
      isDeviceScoped: true
    });
  }
</script>

<div
  class="relative flex flex-col items-center rounded-lg w-full justify-start gap-4 {isExpandedMode &&
    'flex-grow'}"
>
  {#if isExpandedMode}
    <div class="flex flex-col items-center w-full gap-4 dp:gap-8">
      <!-- <div class="relative flex justify-center gap-2 w-full max-w-[28rem]">
        <div class="w-full">
          <Slider
            {parentBackgroundIndex}
            on:time-change={onDynamicSliderChange}
          />
        </div>
      </div> -->
      <ComposeTotalsText composition={$sessionStore.composition} />
      <div class="flex w-full justify-center">
        <PanelSwitcher
          style={PanelSwitcherStyle.TRAIN}
          size={Size.sm}
          parentBgIndex={parentBackgroundIndex}
          items={["Presets", "Custom"]}
          value={selectedMode === 0 ? "Presets" : "Custom"}
          on:switch={onModeSwitch}
        />
        <!-- <AdvancedFocusModeSwitcher bind:selectedMode /> -->
      </div>
    </div>
    {#if selectedMode == 0}
      <PresetPicker
        isExpandedVariant={isExpandedMode}
        {parentBackgroundIndex}
      />
    {:else if $sessionStore.composition.type === SessionCompositionType.END_TIME_FIXED}
      <!-- TODO -->
      <div class="py-8 flex flex-col items-center gap-4">
        <div class="flex flex-col gap-2 items-center">
          <Icon icon="clock" />
          <div class="text-fgs2">End time selected.</div>
        </div>
        <Button
          label="cancel"
          size={Size.sm}
          icon="cross"
          on:click={() => {
            sessionStore.resetComposition();
          }}
        />
      </div>
    {:else}
      <ComposeDuration
        bind:composition={$sessionStore.composition}
        on:change={onCompositionChanges}
        isShowSave={true}
      />
    {/if}
  {:else}
    <div class="flex flex-col px-4 gap-8">
      <div class="h-32">
        {#if selectedMode == 0}
          <PresetPicker
            isExpandedVariant={isExpandedMode}
            {parentBackgroundIndex}
          />
        {:else}
          <div class="relative flex flex-col gap-2 max-w-[19rem]">
            <Slider
              {parentBackgroundIndex}
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
