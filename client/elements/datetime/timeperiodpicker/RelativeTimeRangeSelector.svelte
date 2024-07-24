<script lang="ts">
  import {
    TimePeriodType,
    TimeScale,
    type RelativeTimePeriodValue
  } from "$lib/client/types/time.type";
  import { timePeriodLabel } from "$lib/client/utils/time.utils";
  import { createEventDispatcher } from "svelte";
  import DropDown from "../../dropdown/DropDown.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  const dispatch = createEventDispatcher();
  export let scale: TimeScale;
  export let value: RelativeTimePeriodValue;
  let dropDownValue: string = `${value.type}#${value.param}`;
  // $: console.log({ scale, segemets: segments });
  // $: segments =
  //   scale === TimeScale.DAYS
  //     ? [0, -1, -7, -14, -30]
  //     : scale === TimeScale.WEEKS
  //       ? [0, -1, -4, -8, -12]
  //       : scale === TimeScale.MONTHS
  //         ? [0, -1, -3, -6, -12]
  //         : [0, -1, -2, -3];
  let segments: {
    type: TimePeriodType.RELATIVE | TimePeriodType.UPPER_RELATIVE;
    param: number;
  }[] = [];
  $: segments = resolveOptions(scale) as {
    type: TimePeriodType.RELATIVE | TimePeriodType.UPPER_RELATIVE;
    param: number;
  }[];

  function resolveOptions(scale: TimeScale) {
    switch (scale) {
      case TimeScale.DAYS:
        return [
          { type: TimePeriodType.RELATIVE, param: 0 },
          {
            type: TimePeriodType.RELATIVE,
            param: -1
          },
          {
            type: TimePeriodType.UPPER_RELATIVE,
            param: 0
          },
          {
            type: TimePeriodType.UPPER_RELATIVE,
            param: -1
          },
          {
            type: TimePeriodType.RELATIVE,
            param: -7
          },
          {
            type: TimePeriodType.RELATIVE,
            param: -14
          },
          {
            type: TimePeriodType.RELATIVE,
            param: -30
          }
        ];
      case TimeScale.MONTHS:
        return [
          { type: TimePeriodType.RELATIVE, param: 0 },
          {
            type: TimePeriodType.RELATIVE,
            param: -1
          },
          {
            type: TimePeriodType.UPPER_RELATIVE,
            param: 0
          },
          {
            type: TimePeriodType.UPPER_RELATIVE,
            param: -1
          },
          {
            type: TimePeriodType.RELATIVE,
            param: -3
          },
          {
            type: TimePeriodType.RELATIVE,
            param: -6
          },
          {
            type: TimePeriodType.RELATIVE,
            param: -12
          }
        ];
      default:
        return [
          { type: TimePeriodType.RELATIVE, param: 0 },
          {
            type: TimePeriodType.RELATIVE,
            param: -1
          },
          {
            type: TimePeriodType.RELATIVE,
            param: -2
          },
          {
            type: TimePeriodType.RELATIVE,
            param: -3
          }
        ];
    }
  }
</script>

{#key segments}
  <DropDown
    items={segments.map((item) => ({
      label:
        timePeriodLabel({
          scale: scale,
          value: item
        }) ?? "",
      value: `${item.type}#${item.param}`
    }))}
    bind:value={dropDownValue}
    style={InputStyle.BORDERED}
    label={{ label: "Choose time period" }}
    on:select={() => {
      value = {
        type: dropDownValue.split("#")[0],
        param: parseInt(dropDownValue.split("#")[1])
      };
      dispatch("change", value);
    }}
  />
{/key}
