<script lang="ts">
  import { TimeScale } from "$lib/client/types/time.type";
  import { popover } from "$lib/client/actions/popover.action";
  import { Placement } from "$lib/client/types/direction.enum";
  import TimeScaleSelector from "$lib/client/elements/datetime/TimeScaleSelector.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let start: Date;
  export let end: Date;
  export let scales: TimeScale[] = Object.values(TimeScale);
  export let spanScale: TimeScale | undefined = undefined;
  let ref: HTMLButtonElement | undefined;
  const scaleThresholds = {
    [TimeScale.YEARS]: 365.25,
    [TimeScale.QUARTERS]: 91.31,
    [TimeScale.MONTHS]: 60,
    [TimeScale.WEEKS]: 14,
    [TimeScale.DAYS]: 0
  };

  function getDaysCount(start: Date, end: Date): number {
    const diffMs = end.getTime() - start.getTime();
    return diffMs / (1000 * 60 * 60 * 24);
  }

  function calculateTimeSpan(
    start: Date,
    end: Date,
    scale?: TimeScale
  ): { count: number; scale: TimeScale } {
    const diffDays = getDaysCount(start, end);

    if (scale) {
      return {
        count: Math.ceil(
          scale === TimeScale.DAYS
            ? diffDays
            : scale === TimeScale.WEEKS
              ? diffDays / 7
              : scale === TimeScale.MONTHS
                ? diffDays / 30.44
                : scale === TimeScale.QUARTERS
                  ? diffDays / 91.31
                  : diffDays / 365.25
        ),
        scale
      };
    }

    const availableThresholds = Object.entries(scaleThresholds)
      .filter(([scale]) => scales.includes(scale as TimeScale))
      .map(([scale, threshold]) => ({ scale: scale as TimeScale, threshold }));

    const selectedScale = availableThresholds.find(
      ({ threshold }) => diffDays >= threshold
    );

    return calculateTimeSpan(
      start,
      end,
      selectedScale?.scale || scales[scales.length - 1]
    );
  }

  $: timeSpan = calculateTimeSpan(start, end, spanScale);
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
