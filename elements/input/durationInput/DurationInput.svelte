<script lang="ts">
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import type { FormLabelInfoTooltip } from "$lib/tidy/types/text.type";
  import { TimeUnit } from "$lib/tidy/types/time.type";
  import FormControlLabelWrapper from "../../text/formLabel/FormControlLabelWrapper.svelte";
  import TextInputWithDropdown from "./TextInputWithDropdown.svelte";
  export let parentBackgroundIndex: number = 1;
  export let value: number;
  export let label: string | undefined = undefined;
  export let info: FormLabelInfoTooltip | undefined = undefined;
  export let labelOrientation: Orientation = Orientation.Vertical;
  let inputTextBox: any;
  let units: TimeUnit[] = [TimeUnit.SECONDS, TimeUnit.MINUTES, TimeUnit.HOURS];
  let currentTimeUnit: TimeUnit =
    value < 60
      ? TimeUnit.SECONDS
      : value < 3600
        ? TimeUnit.MINUTES
        : TimeUnit.HOURS;
</script>

<FormControlLabelWrapper {label} orientation={labelOrientation} {info}>
  <div
    class={labelOrientation === Orientation.Vertical
      ? "max-w-md"
      : "max-w-[16rem]"}
  >
    <TextInputWithDropdown
      {units}
      {currentTimeUnit}
      {parentBackgroundIndex}
      bind:value
      on:change
      on:input
      bind:this={inputTextBox}
    />
  </div>
</FormControlLabelWrapper>
