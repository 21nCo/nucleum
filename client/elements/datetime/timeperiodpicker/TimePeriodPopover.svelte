<script lang="ts">
  import {
    type TimePeriod,
    TimeScale,
    TimePeriodType,
    type RelativeTimePeriodValue
  } from "$lib/client/types/time.type";
  import { createEventDispatcher, onMount } from "svelte";
  import OptionSelector from "../../select/OptionSelector.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import RelativeTimeRangeSelector from "./RelativeTimeRangeSelector.svelte";
  import PanelSwitcher from "../../switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import AbsoluteTimeRangePopover from "../absolute/AbsoluteTimeRangePopover.svelte";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import { scale } from "svelte/transition";
  import TimePeriodPicker from "./TimePeriodPicker.svelte";
  const dispatch = createEventDispatcher();
  export let period: TimePeriod;
  let selectedPeriodType =
    period.value.type === TimePeriodType.ABSOLUTE ? "Absolute" : "Relative";
  let previouslySelectedRelative: any;
  let previouslySelectedAbsolute: any;
  if (period?.value?.type === TimePeriodType.ABSOLUTE) {
    previouslySelectedAbsolute = {
      scale: period.scale,
      param: { type: TimePeriodType.ABSOLUTE, param: period.value.param }
    };
  } else if (period?.value?.type === TimePeriodType.RELATIVE) {
    previouslySelectedRelative = {
      scale: period.scale,
      value: { type: TimePeriodType.RELATIVE, param: period.value.param }
    };
  }
  if (!previouslySelectedRelative) {
    previouslySelectedRelative = {
      scale: TimeScale.DAYS,
      value: { type: TimePeriodType.RELATIVE, param: 0 }
    };
  }
  if (!previouslySelectedAbsolute) {
    previouslySelectedAbsolute = {
      scale: TimeScale.DAYS,
      param: { start: new Date(), end: new Date() }
    };
  }
  let scales = Object.keys(TimeScale); //$userPreferences.timeScales ??
  let selectedScale = period.scale;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="flex flex-col items-center gap-4 w-full" on:click|stopPropagation>
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
                type: previouslySelectedRelative.value.type,
                param: previouslySelectedRelative.value.param
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
      if (selectedPeriodType === "Relative") dispatch("change", period);
    }}
  />
  <OptionSelector
    labelProps={{ label: "Group by" }}
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
        dispatch("change", period);
      } else {
        previouslySelectedAbsolute.scale = selectedScale;
      }
    }}
  />
  {#key selectedScale}
    {#if selectedPeriodType === "Relative"}
      <RelativeTimeRangeSelector
        scale={selectedScale}
        bind:value={period.value}
        on:change={(event) => {
          if (selectedPeriodType === "Relative") {
            previouslySelectedRelative = {
              scale: selectedScale,
              value: event.detail
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
      <AbsoluteTimeRangePopover
        scale={selectedScale}
        on:rangePicked={(e) => {
          const period = {
            scale: selectedScale,
            value: {
              param: { start: e.detail.start, end: e.detail.end },
              type: TimePeriodType.ABSOLUTE
            }
          };
          previouslySelectedAbsolute = {
            scale: selectedScale,
            param: period.value.param
          };
          dispatch("change", period);
        }}
      />
    {/if}
  {/key}
</div>
