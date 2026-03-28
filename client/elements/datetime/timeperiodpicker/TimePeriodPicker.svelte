<script lang="ts">
  import { popover } from "@21n/actions/popover.action";
  import { InputStyle } from "@21n/types/input.type";
  import type { TimePeriod } from "@21n/types/time.type";
  import { timePeriodLabel } from "@21n/utils/time.utils";
  import FormElement from "@21n/elements/FormElement.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import TimePeriodPopover from "@21n/elements/datetime/timeperiodpicker/TimePeriodPopover.svelte";
  import { createEventDispatcher } from "svelte";
  export let period: TimePeriod;
  export let parentBgIndex: number = 1;
  $: void parentBgIndex;
  let isActive: boolean = false;
  $: label = timePeriodLabel(period);
  const dispatch = createEventDispatcher();

  function onTimePeriodChange(val: TimePeriod) {
    period = val;
    dispatch("change", val);
  }

  function onPopoverChange(e: Event) {
    isActive = (e as CustomEvent<{ open?: boolean }>).detail?.open ?? false;
  }
</script>

<FormElement style={InputStyle.BORDERED} isFocused={isActive}>
  <div
    class="flex items-center justify-between w-full p-2"
    use:popover={{
      content: TimePeriodPopover,
      id: "time-period-popover",
      isRenderAsModalForCW: true,
      componentProps: {
        period,
        onChange: onTimePeriodChange
      }
    }}
    on:change={onPopoverChange}
  >
    <span class="text-wrap">
      {label}
    </span>
    <Icon icon={isActive ? "chevron-up" : "chevron-down"} />

    <!-- <TimePeriodPopover bind:period on:change /> -->
  </div>
</FormElement>
