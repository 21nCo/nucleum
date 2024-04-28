<script lang="ts">
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import type { FormLabelInfoTooltip } from "$lib/tidy/types/text.type";
  import { TimeUnit } from "$lib/tidy/types/time.type";
  import { createEventDispatcher } from "svelte";
  import FormControlLabelWrapper from "../../text/formLabel/FormControlLabelWrapper.svelte";
  import TimeInputWithSuggestions from "./TimeInputWithSuggestions.svelte";
  import TimeUnitDropdown from "./TimeUnitDropdown.svelte";
  export let parentBackgroundIndex: number = 1;
  export let value: number;
  export let label: string | undefined = undefined;
  export let info: FormLabelInfoTooltip | undefined = undefined;
  export let labelOrientation: Orientation = Orientation.Vertical;
  export let placeholder: string | undefined = undefined;
  const dispatch = createEventDispatcher();
  let inputRef: any;

  let units: TimeUnit[] = [TimeUnit.MINUTES, TimeUnit.HOURS];
  let currentUnit: TimeUnit;

  $: currentUnit =
    value < 60
      ? TimeUnit.SECONDS
      : value < 3600
        ? TimeUnit.MINUTES
        : TimeUnit.HOURS;

  export function focus() {
    if (inputRef) inputRef.focus();
  }

  function handleUnitChanged({
    detail: {
      unit: { new: newTimeUnit, old: oldTimeUnit }
    }
  }: {
    detail: {
      unit: {
        new: TimeUnit;
        old: TimeUnit;
      };
    };
  }) {
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
    dispatch("change", value);
  }
</script>

<FormControlLabelWrapper {label} orientation={labelOrientation} {info}>
  <div
    class={labelOrientation === Orientation.Vertical
      ? "max-w-md"
      : "max-w-[16rem]"}
  >
    <div class="text-center text-base self-center w-full">
      <div class="flex flex-col gap-1 w-full">
        <div class="relative flex items-center w-full">
          <TimeInputWithSuggestions
            {units}
            bind:duration={value}
            bind:currentUnit
            on:change
          />
          <TimeUnitDropdown
            on:change={handleUnitChanged}
            {units}
            bind:currentTimeUnit={currentUnit}
          />
        </div>
      </div>
    </div>
  </div>
</FormControlLabelWrapper>
