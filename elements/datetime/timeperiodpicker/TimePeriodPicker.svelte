<script lang="ts">
  import type { TimePeriod } from "$lib/tidy/types/time.type";
  import { timePeriodLabel } from "$lib/tidy/utils/time.utils";
  import Icon from "../../Icon.svelte";
  import Popover from "../../popover/Popover.svelte";
  import FormControlLabelWrapper from "../../text/formLabel/FormControlLabelWrapper.svelte";
  import TimePeriodPopover from "./TimePeriodPopover.svelte";
  export let period: TimePeriod;
  let options = {
    class: "flex p-4 items-center justify-center w-96 h-96"
  };
  let popoverRef: any;
  $: label = timePeriodLabel(period);
</script>

<Popover bind:this={popoverRef} {options}>
  <slot:fragment name="trigger" slot="trigger">
    <FormControlLabelWrapper>
      <div class="flex gap-2 p-2 border border-brs3 rounded-md">
        {label}
        <!-- TODO - isPopoverVisible binding from Popover and icon change -->
        <Icon icon="chevdown" />
      </div>
    </FormControlLabelWrapper>
  </slot:fragment>
  <slot:fragment name="popover" slot="popover">
    <TimePeriodPopover bind:period on:change />
  </slot:fragment>
</Popover>
<div></div>
