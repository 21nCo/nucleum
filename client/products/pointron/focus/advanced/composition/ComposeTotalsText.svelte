<script lang="ts">
  import {
    BreakCompositionType,
    SessionCompositionType,
    type SessionComposition
  } from "$lib/client/types/pointron/sessionComposition.type";
  import { getTotalsFromComposition } from "$lib/client/products/pointron/pointron.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  // export let totals: { duration: number; focus: number; brek: number };
  // export let compositionType: SessionCompositionType;
  export let composition: SessionComposition;
  export let parentBgIndex: number = 1;
  // export let breakType: BreakCompositionType;
  $: totals = getTotalsFromComposition({
    composition
  });
</script>

<div
  class={cn(
    "flex w-full justify-around opacity-90 text-fgs2 text-b3 sm:text-b2 py-2 rounded-md",
    bg(parentBgIndex)
  )}
>
  <div class="flex justify-start gap-1">
    Total: <span class="min-w-[2rem]">
      {composition.type === SessionCompositionType.COUNTUP
        ? "∞"
        : formatSeconds(totals.duration)}
    </span>
  </div>
  <div class="flex justify-start gap-1 text-aps1">
    Focus: <span class="min-w-[2rem]">
      {composition.type === SessionCompositionType.COUNTUP
        ? "∞"
        : formatSeconds(totals.focus)}
    </span>
  </div>
  <div class="text-ass1">
    Break: {composition.breakType === BreakCompositionType.REMINDER ||
    composition.type === SessionCompositionType.COUNTUP
      ? "NA"
      : formatSeconds(totals.brek)}
  </div>
</div>
