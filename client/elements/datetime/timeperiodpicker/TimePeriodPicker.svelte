<script lang="ts">
  import type { PopoverInputOptions } from "$lib/client/types/input.type";
  import type { TimePeriod } from "$lib/client/types/time.type";
  import { timePeriodLabel } from "$lib/client/utils/time.utils";
  import Icon from "../../Icon.svelte";
  import InputBaseElement from "../../InputBaseElement.svelte";
  import TimePeriodPopover from "./TimePeriodPopover.svelte";
  export let period: TimePeriod;
  export let parentBgIndex: number = 1;
  let isActive: boolean;
  let popoverOptions: PopoverInputOptions = {
    class: "flex p-4 items-center justify-center mo:w-9/10 w-96 h-96",
    parentBgIndex
  };
  $: label = timePeriodLabel(period);
</script>

<InputBaseElement {popoverOptions} class="flex justify-around" bind:isActive>
  <span class="text-wrap">
    {label}
  </span>
  <Icon icon={isActive ? "chevup" : "chevdown"} />
  <slot name="popover" slot="popover">
    <TimePeriodPopover bind:period on:change />
  </slot>
</InputBaseElement>
