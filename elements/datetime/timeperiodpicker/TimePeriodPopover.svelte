<script lang="ts">
  import {
    type TimePeriod,
    TimeScale,
    TimePeriodType
  } from "$lib/tidy/types/time.type";
  import { createEventDispatcher } from "svelte";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import OptionSelector from "../../select/OptionSelector.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import RelativeTimeRangeSelector from "./RelativeTimeRangeSelector.svelte";
  import PanelSwitcher from "../../switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import AbsoluteTimeRangePopover from "../absolute/AbsoluteTimeRangePopover.svelte";
  import { OptionSelectorStyle } from "$lib/tidy/types/select.type";
  const dispatch = createEventDispatcher();
  export let period: TimePeriod;
  let selectedPeriodType = "Relative";
  let previouslySelectedRelative: { scale: TimeScale; param: number } = {
    scale: TimeScale.DAYS,
    param: 0
  };
  let previouslySelectedAbsolute: {
    scale: TimeScale;
    param: { start: Date; end: Date };
  } = {
    scale: TimeScale.DAYS,
    param: { start: new Date(), end: new Date() }
  };
  let scales = $userPreferences.timeScales ?? Object.keys(TimeScale);
  let selectedScale = period.scale;
  // $: console.log({ scales, timePeriod: period });
</script>

<div class="flex flex-col items-center gap-4 w-full">
  <PanelSwitcher
    items={["Relative", "Absolute"]}
    bind:value={selectedPeriodType}
    style={PanelSwitcherStyle.TRAIN}
    size={Size.sm}
    on:switch={(event) => {
      period =
        selectedPeriodType === "Relative"
          ? {
              value: {
                type: TimePeriodType.RELATIVE,
                param: previouslySelectedRelative.param
              },
              scale: previouslySelectedRelative.scale
            }
          : {
              value: {
                type: TimePeriodType.ABSOLUTE,
                param: previouslySelectedAbsolute.param
              },
              scale: previouslySelectedAbsolute.scale
            };
      dispatch("change", period);
    }}
  />
  <OptionSelector
    labelProps={{ label: "Choose time scale" }}
    style={OptionSelectorStyle.TRAIN}
    size={Size.sm}
    options={scales.map((scale) => ({
      value: scale
    }))}
    bind:selected={selectedScale}
    on:select={() => {
      period.scale = selectedScale;
      if (selectedPeriodType === "Relative") {
        previouslySelectedRelative.scale = selectedScale;
      } else {
        previouslySelectedAbsolute.scale = selectedScale;
      }
      dispatch("change", period);
    }}
  />
  {#if selectedPeriodType === "Relative"}
    <RelativeTimeRangeSelector
      scale={selectedScale}
      bind:value={period.value}
      on:change={(event) => {
        if (selectedPeriodType === "Relative") {
          previouslySelectedRelative = {
            scale: selectedScale,
            param: event.detail
          };
        } else {
          previouslySelectedAbsolute = {
            scale: selectedScale,
            param: event.detail
          };
        }
        dispatch("change", period);
      }}
    />
  {:else}
    {#key selectedScale}
      <AbsoluteTimeRangePopover
        scale={selectedScale}
        on:update={(event) => {
          dispatch("update", event.detail);
        }}
      />
    {/key}
  {/if}
</div>
