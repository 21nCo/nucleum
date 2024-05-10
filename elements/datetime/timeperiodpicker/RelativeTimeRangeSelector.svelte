<script lang="ts">
  import {
    TimePeriodType,
    TimeScale,
    type TimePeriodValue
  } from "$lib/tidy/types/time.type";
  import { timePeriodLabel } from "$lib/tidy/utils/time.utils";
  import { createEventDispatcher } from "svelte";
  import DropDown from "../../dropdown/DropDown.svelte";
  import { DropDownStyle } from "$lib/tidy/types/dropdownItem.type";
  const dispatch = createEventDispatcher();
  export let scale: TimeScale;
  export let value: TimePeriodValue;
  // $: console.log({ scale, segemets: segments });
  $: segments =
    scale === TimeScale.DAYS
      ? [0, -1, -7, -14, -30]
      : scale === TimeScale.WEEKS
        ? [0, -1, -4, -8, -12]
        : scale === TimeScale.MONTHS
          ? [0, -1, -3, -6, -12]
          : [0, -1, -2, -3];
</script>

{#if value.type === TimePeriodType.RELATIVE}
  {#key segments}
    <DropDown
      items={segments.map((item) => ({
        label:
          timePeriodLabel({
            scale: scale,
            value: {
              type: TimePeriodType.RELATIVE,
              param: item
            }
          }) ?? "",
        value: item
      }))}
      bind:value={value.param}
      style={DropDownStyle.OUTLINED}
      label="Choose time period"
      on:select={() => {
        dispatch("change", value.param);
      }}
    />
  {/key}
{/if}
