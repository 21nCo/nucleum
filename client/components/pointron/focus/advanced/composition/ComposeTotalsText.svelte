<script lang="ts">
  import {
    BreakCompositionType,
    SessionCompositionType,
    type SessionComposition
  } from "$lib/client/types/pointron/sessionComposition.type";
  import { getTotalsFromComposition } from "$lib/client/components/pointron/pointron.utils";
  import BackgroundElement from "$lib/client/elements/style/BackgroundElement.svelte";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  // export let totals: { duration: number; focus: number; brek: number };
  // export let compositionType: SessionCompositionType;
  export let composition: SessionComposition;
  // export let breakType: BreakCompositionType;
  $: totals = getTotalsFromComposition({
    composition
  });
</script>

<BackgroundElement
  class="flex w-full justify-around opacity-90 text-fgs2 text-b3 sm:text-b2 py-2 rounded-md"
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
</BackgroundElement>
