<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import { InputStyle } from "$lib/client/types/input.type";
  import type { TimePeriod } from "$lib/client/types/time.type";
  import { timePeriodLabel } from "$lib/client/utils/time.utils";
  import FormElement from "../../FormElement.svelte";
  import Icon from "../../Icon.svelte";
  import TimePeriodPopover from "./TimePeriodPopover.svelte";
  import { createEventDispatcher } from "svelte";
  export let period: TimePeriod;
  export let parentBgIndex: number = 1;
  let isActive: boolean = false;
  $: label = timePeriodLabel(period);
  const dispatch = createEventDispatcher();
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
        onChange: (val) => {
          period = val;
          dispatch("change", val);
        }
      }
    }}
    on:change={(e) => {
      isActive = e.detail?.open;
    }}
  >
    <span class="text-wrap">
      {label}
    </span>
    <Icon icon={isActive ? "chevup" : "chevdown"} />

    <!-- <TimePeriodPopover bind:period on:change /> -->
  </div>
</FormElement>
