<script lang="ts">
  import {
    TimePeriodType,
    TimeScale,
    type RelativeTimePeriodValue
  } from "@21n/types/time.type";
  import { timePeriodLabel } from "@21n/utils/time.utils";
  import { createEventDispatcher } from "svelte";
  import DropDown from "@21n/elements/dropdown/DropDown.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { Orientation } from "@21n/types/direction.enum";
  import { resolveRelativeTimePeriodOptions } from "@21n/elements/datetime/datetime.utils";
  import type { ISelectItem } from "@21n/types/select.type";
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
  let segments: ISelectItem[] = [];
  $: segments = resolveRelativeTimePeriodOptions(scale);
</script>

{#key segments}
  <DropDown
    items={segments}
    bind:value={dropDownValue}
    style={InputStyle.BORDERED}
    label={{ label: "Choose time period", orientation: Orientation.Vertical }}
    on:select={() => {
      value = {
        type: dropDownValue.split("#")[0],
        param: parseInt(dropDownValue.split("#")[1])
      };
      dispatch("change", value);
    }}
  />
{/key}
