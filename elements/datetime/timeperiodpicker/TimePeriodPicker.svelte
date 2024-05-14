<script lang="ts">
  import type { PopoverInputOptions } from "$lib/tidy/types/input.type";
  import type { TimePeriod } from "$lib/tidy/types/time.type";
  import { timePeriodLabel } from "$lib/tidy/utils/time.utils";
  import Icon from "../../Icon.svelte";
  import InputBaseElement from "../../InputBaseElement.svelte";
  import TimePeriodPopover from "./TimePeriodPopover.svelte";
  export let period: TimePeriod;
  export let parentBgIndex: number = 1;
  let isActive: boolean;
  let popoverOptions: PopoverInputOptions = {
    class: "flex p-4 items-center justify-center w-96 h-96",
    parentBgIndex
  };
  $: label = timePeriodLabel(period);
</script>

<InputBaseElement {popoverOptions} class="flex justify-between" bind:isActive>
  <span class="min-w-fit">
    {label}
  </span>
  <Icon icon={isActive ? "chevup" : "chevdown"} />
  <slot name="popover" slot="popover">
    <TimePeriodPopover bind:period on:change />
  </slot>
</InputBaseElement>
