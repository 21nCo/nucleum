<script lang="ts">
  import { TimeUnit } from "$lib/tidy/types/time.type";
  import TimeInputFieldWithDropdown from "./TimeInputFieldWithDropdown.svelte";
  import TimeUnitDropdown from "./TimeUnitDropdown.svelte";

  //Common props
  export let currentTimeUnit: TimeUnit;
  export let units: TimeUnit[];

  //TimeInputFieldWithDropdown props
  export let parentBackgroundIndex: number = 1;
  export let value: number;
  export let placeholder: string | undefined = undefined;
  let inputRef: any;

  export function focus() {
    if (inputRef) inputRef.focus();
  }

  function handleUnitChanged({
    detail: {
      unit: { new: newTimeUnit, old: oldTimeUnit },
    },
  }: {
    detail: {
      unit: {
        new: TimeUnit;
        old: TimeUnit;
      };
    };
  }) {
    //since we are keeping the value of the of the variable `value` always in minutes we need to convert it to the new time unit (Note: this value is different from the value shown in the input field)
    if (
      (newTimeUnit === TimeUnit.HOURS && oldTimeUnit === TimeUnit.MINUTES) ||
      (newTimeUnit === TimeUnit.MINUTES && oldTimeUnit === TimeUnit.SECONDS)
    )
      value = value * 60;
    else if (
      (newTimeUnit === TimeUnit.MINUTES && oldTimeUnit === TimeUnit.HOURS) ||
      (newTimeUnit === TimeUnit.SECONDS && oldTimeUnit === TimeUnit.MINUTES)
    )
      value = value / 60;
    else if (newTimeUnit === TimeUnit.HOURS && oldTimeUnit === TimeUnit.SECONDS)
      value = value * 3600;
    else if (newTimeUnit === TimeUnit.SECONDS && oldTimeUnit === TimeUnit.HOURS)
      value = value / 3600;
  }
  $: {
    console.log("Text Input With Dropdown", { currentTimeUnit });
  }
</script>

<div class="text-center text-base self-center w-full">
  <div class="flex flex-col gap-1 w-full">
    <div class="relative flex items-center w-full">
      <TimeInputFieldWithDropdown
        bind:value
        bind:currentTimeUnit
        {parentBackgroundIndex}
        {placeholder}
        bind:this={inputRef}
        on:change
        on:input
        on:enter
      />
      <TimeUnitDropdown
        on:unit-changed={handleUnitChanged}
        {units}
        bind:currentTimeUnit
      />
    </div>
  </div>
</div>

<!-- placeholder={placeholder ?? ""} -->
