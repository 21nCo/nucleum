<script lang="ts">
  import { type TimePeriod, TimeScale, TimePeriodType, type RelativeTimePeriodValue } from "@21n/shared-utils/datetime/period.type";
  import OptionSelector from "@21n/ui/elements/select/OptionSelector.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import RelativeTimeRangeSelector from "@21n/ui/elements/datetime/timeperiodpicker/RelativeTimeRangeSelector.svelte";
  import PanelSwitcher from "@21n/ui/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "@21n/ui/elements/switcher/switcher.enum";
  import { OptionSelectorStyle } from "@21n/ui/elements/select/select.type";
  import CalendarRangePopover from "@21n/ui/elements/datetime/absolute/CalendarRangePopover.svelte";
  import { Orientation } from "@21n/ui/elements/direction.enum";
  let {
    period,
    scales = [TimeScale.DAYS, TimeScale.MONTHS, TimeScale.YEARS],
    onChange
  }: {
    period: TimePeriod;
    scales?: TimeScale[];
    onChange?: (period: TimePeriod) => void;
  } = $props();
  type AbsoluteTimePeriodValue = Extract<
    TimePeriod["value"],
    { type: TimePeriodType.ABSOLUTE }
  >;

  let selectedPeriodType = $state(
    period.value.type === TimePeriodType.ABSOLUTE ? "Absolute" : "Relative"
  );
  let previouslySelectedRelative = $state<TimePeriod<RelativeTimePeriodValue>>({
    scale: TimeScale.DAYS,
    value: { type: TimePeriodType.RELATIVE, param: 0 }
  });
  let previouslySelectedAbsolute = $state<TimePeriod<AbsoluteTimePeriodValue>>({
    scale: TimeScale.DAYS,
    value: {
      type: TimePeriodType.ABSOLUTE,
      param: { start: new Date(), end: new Date() }
    }
  });

  function isRelativePeriodValue(
    value: TimePeriod["value"]
  ): value is RelativeTimePeriodValue {
    return (
      value.type === TimePeriodType.RELATIVE ||
      value.type === TimePeriodType.UPPER_RELATIVE
    );
  }

  function isAbsolutePeriodValue(
    value: TimePeriod["value"]
  ): value is AbsoluteTimePeriodValue {
    return value.type === TimePeriodType.ABSOLUTE;
  }

  function resolveRelativeValue() {
    return isRelativePeriodValue(period.value)
      ? period.value
      : previouslySelectedRelative?.value ?? {
          type: TimePeriodType.RELATIVE,
          param: 0
        };
  }

  function resolveAbsoluteValue() {
    return isAbsolutePeriodValue(period.value)
      ? period.value
      : previouslySelectedAbsolute?.value ?? {
          type: TimePeriodType.ABSOLUTE,
          param: { start: new Date(), end: new Date() }
        };
  }

  if (isAbsolutePeriodValue(period?.value)) {
    previouslySelectedAbsolute = {
      scale: period.scale,
      value: { type: TimePeriodType.ABSOLUTE, param: period.value.param }
    };
  } else if (isRelativePeriodValue(period?.value)) {
    previouslySelectedRelative = {
      scale: period.scale,
      value: { type: period.value.type, param: period.value.param }
    };
  }
  let selectedScale = $state(period.scale);

  function dispatchChange(period: TimePeriod) {
    if (onChange) onChange(period);
  }

  function handleAbsoluteRangeChange(val: { start: string; end: string }) {
    period = {
      scale: selectedScale,
      value: {
        param: {
          start: new Date(val.start),
          end: new Date(val.end)
        },
        type: TimePeriodType.ABSOLUTE
      }
    };
    previouslySelectedAbsolute = {
      scale: selectedScale,
      value: resolveAbsoluteValue()
    };
    dispatchChange(period);
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<button
  class="flex flex-col items-center gap-4 bg-bgs1 p-4 cw:w-full w-96 cw:h-[30rem] h-96 min-h-fit"
  onclick={(event) => event.stopPropagation()}
>
  <PanelSwitcher
    items={["Relative", "Absolute"]}
    value={selectedPeriodType}
    style={PanelSwitcherStyle.TRAIN}
    size={Size.sm}
    onSwitch={(event) => {
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
                param: previouslySelectedAbsolute.value.param
              },
              scale: previouslySelectedAbsolute.scale
            };
      selectedPeriodType = event.detail;
      selectedScale = period.scale;
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
      onSelect={(event) => {
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
        value={resolveRelativeValue()}
        onChange={(event: CustomEvent<any>) => {
          if (selectedPeriodType === "Relative") {
            previouslySelectedRelative = {
              scale: selectedScale,
              value: event.detail
            };
          } else {
            previouslySelectedAbsolute = {
              scale: selectedScale,
              value: resolveAbsoluteValue()
            };
          }
          period.value = event.detail;
          dispatchChange(period);
        }}
      />
    {:else}
      <CalendarRangePopover
        initialStartDate={resolveAbsoluteValue().param.start}
        initialEndDate={resolveAbsoluteValue().param.end}
        isInline={true}
        onDateChange={() => undefined}
        onRangeChange={handleAbsoluteRangeChange}
      />
    {/if}
  {/key}
</button>
