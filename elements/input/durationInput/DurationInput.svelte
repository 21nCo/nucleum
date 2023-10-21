<script lang="ts">
  import { TimeUnit } from "$lib/tidy/types/time.type";
  import TextInputWithDropdown from "./TextInputWithDropdown.svelte";
  export let parentBackgroundIndex: number = 1;
  export let value: number;
  let inputTextBox: any;
  let units: TimeUnit[] = [TimeUnit.SECONDS, TimeUnit.MINUTES, TimeUnit.HOURS];
  let currentTimeUnit: TimeUnit = units[1];
</script>

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
