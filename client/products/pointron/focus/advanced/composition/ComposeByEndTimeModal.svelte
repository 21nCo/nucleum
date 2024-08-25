<script lang="ts">
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { SessionCompositionType } from "$lib/client/types/pointron/sessionComposition.type";
  import TimeSelector from "$lib/client/components/TimeSelector.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { incrementTime } from "$lib/client/utils/time.utils";
  import ComposeBreak from "./ComposeBreak.svelte";
  import ComposeTotalsText from "./ComposeTotalsText.svelte";
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
    $sessionStore.end = resolveEndTime();
    $sessionStore.composition.type = SessionCompositionType.END_TIME_FIXED;
    sessionStore.onComposeComplete();
  }
</script>

<div class="flex flex-col h-full w-full gap-12">
  <ComposeTotalsText composition={$sessionStore.composition} />
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
      bind:composition={$sessionStore.composition}
    />
  </div>
</div>
