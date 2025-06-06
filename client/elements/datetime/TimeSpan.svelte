<script lang="ts">
  import { TimeScale } from "$lib/client/types/time.type";
  import { popover } from "$lib/client/actions/popover.action";
  import { Placement } from "$lib/client/types/direction.enum";
  import TimeScaleSelector from "$lib/client/elements/datetime/TimeScaleSelector.svelte";
  import { createEventDispatcher } from "svelte";
  import {
    calculateTimeSpan,
    getDaysCount,
    scaleThresholds
  } from "./datetime.utils";
  const dispatch = createEventDispatcher();

  export let start: Date;
  export let end: Date;
  export let scales: TimeScale[] = Object.values(TimeScale);
  export let spanScale: TimeScale | undefined = undefined;
  let ref: HTMLButtonElement | undefined;

  $: timeSpan = calculateTimeSpan(start, end, scales, spanScale);
  $: totalDays = getDaysCount(start, end);
  $: availableScales = scales.filter(
    (scale) => totalDays >= scaleThresholds[scale]
  );

  function handleScaleSelect(scale: TimeScale) {
    spanScale = scale;
    dispatch("change", scale);
    hidePopover();
  }

  function hidePopover() {
    ref?.dispatchEvent(new CustomEvent("hide"));
  }
</script>

<div class="flex flex-col gap-2">
  <div class="text-sm">
    Spanning {timeSpan.count}
    <button
      class="cursor-pointer border-b border-dotted border-fgs2 hover:border-fgs3"
      bind:this={ref}
      use:popover={{
        placement: Placement.BottomCenter,
        content: TimeScaleSelector,
        id: "time-span-scale-popover",
        componentProps: {
          scales: availableScales,
          onSelect: handleScaleSelect
        }
      }}
    >
      {timeSpan.scale.toLowerCase()}
    </button>
  </div>
</div>
