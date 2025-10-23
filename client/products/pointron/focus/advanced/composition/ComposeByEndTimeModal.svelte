<script lang="ts">
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import { SessionCompositionType } from "@21n/types/pointron/sessionComposition.type";
  import TimeSelector from "@21n/components/TimeSelector.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import { incrementTime } from "@21n/utils/time.utils";
  import ComposeBreak from "@21n/products/pointron/focus/advanced/composition/ComposeBreak.svelte";
  import ComposeTotalsText from "@21n/products/pointron/focus/advanced/composition/ComposeTotalsText.svelte";
  export const id: string = "";
  let endTime: Date = new Date(incrementTime(new Date(), 1, true));
  let hour: number = endTime.getHours();
  let minute: number = endTime.getMinutes();
  onChange();
  function resolveEndTime() {
    const endTime = new Date();
    endTime.setHours(hour);
    endTime.setMinutes(minute);
    endTime.setSeconds(0);
    endTime.setMilliseconds(0);
    return endTime;
  }
  function onChange() {
    $activeSession.end = resolveEndTime();
    $activeSession.composition.type = SessionCompositionType.END_TIME_FIXED;
    activeSession.onComposeComplete();
  }
</script>

<div class="flex flex-col h-full w-full gap-12">
  <ComposeTotalsText composition={$activeSession.composition} />
  <div class="flex flex-col gap-6 w-full">
    <TimeSelector
      label="Session end time"
      bind:hour
      bind:minute
      labelOrientation={Orientation.Horizontal}
      on:change={onChange}
      isShowOnlyAfterCurrentTime={true}
    />
    <ComposeBreak
      on:change={onChange}
      bind:composition={$activeSession.composition}
    />
  </div>
</div>
