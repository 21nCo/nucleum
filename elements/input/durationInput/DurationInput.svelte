<script lang="ts">
  import { TimeUnit } from "$lib/tidy/types/time.type";
  import FormControlLabel from "../../text/FormControlLabel.svelte";
  import TextInputWithDropdown from "./TextInputWithDropdown.svelte";
  export let parentBackgroundIndex: number = 1;
  export let value: number;
  export let label: string | undefined = undefined;
  let inputTextBox: any;
  let units: TimeUnit[] = [TimeUnit.SECONDS, TimeUnit.MINUTES, TimeUnit.HOURS];
  let currentTimeUnit: TimeUnit = units[1];
</script>

<div class="flex flex-col gap-1 w-full">
  {#if label}
    <FormControlLabel {label} />
  {/if}
  <div class="max-w-md">
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
</div>
