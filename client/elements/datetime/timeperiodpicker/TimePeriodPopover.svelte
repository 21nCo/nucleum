<script lang="ts">
  import {
    type TimePeriod,
    TimeScale,
    TimePeriodType,
    type RelativeTimePeriodValue
  } from "@21n/types/time.type";
  import { createEventDispatcher, onMount } from "svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import { Size } from "@21n/types/size.enum";
  import RelativeTimeRangeSelector from "@21n/elements/datetime/timeperiodpicker/RelativeTimeRangeSelector.svelte";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "@21n/types/switcher.enum";
  import { OptionSelectorStyle } from "@21n/types/select.type";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import AbsoluteTimeRangePopoverV2 from "@21n/elements/datetime/absolute/AbsoluteTimeRangePopoverV2.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  const dispatch = createEventDispatcher();
  export let period: TimePeriod;
  export let onChange: (period: TimePeriod) => void;

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
  let scales = $userPreferences.timeScales ?? [
    TimeScale.DAYS,
    TimeScale.MONTHS,
    TimeScale.YEARS
  ];
  let selectedScale = period.scale;

  function dispatchChange(period: TimePeriod) {
    if (onChange) onChange(period);
    dispatch("change", period);
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<button
  class="flex flex-col items-center gap-4 bg-bgs1 p-4 cw:w-full w-96 cw:h-[30rem] h-96 min-h-fit"
  on:click|stopPropagation
>
  <PanelSwitcher
    items={["Relative", "Absolute"]}
    value={selectedPeriodType}
    style={PanelSwitcherStyle.TRAIN}
    size={Size.sm}
    on:switch={(event) => {
      period =
        event.detail === "Relative"
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
      selectedPeriodType = event.detail;
      if (selectedPeriodType === "Relative") dispatchChange(period);
    }}
  />
  {#if selectedPeriodType === "Relative"}
    <OptionSelector
      labelProps={{ label: "Group by", orientation: Orientation.Vertical }}
      style={OptionSelectorStyle.TRAIN}
      size={Size.sm}
      options={scales.map((scale) => ({
        value: scale
      }))}
      selected={selectedScale}
      on:select={(event) => {
        const selected = event.detail;
        period.scale = selected;
        if (selectedPeriodType === "Relative") {
          previouslySelectedRelative.scale = selected;
          dispatchChange(period);
        } else {
          previouslySelectedAbsolute.scale = selected;
        }
        selectedScale = selected;
      }}
    />
  {/if}

  {#key selectedScale}
    {#if selectedPeriodType === "Relative"}
      <RelativeTimeRangeSelector
        scale={selectedScale}
        value={period.value}
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
          period.value = event.detail;
          dispatchChange(period);
        }}
      />
    {:else}
      <AbsoluteTimeRangePopoverV2
        scale={selectedScale}
        initialStartDate={period.value.param.start}
        initialEndDate={period.value.param.end}
        isInline={true}
        on:rangePicked={(e) => {
          period = {
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
          dispatchChange(period);
        }}
      />
    {/if}
  {/key}
</button>
