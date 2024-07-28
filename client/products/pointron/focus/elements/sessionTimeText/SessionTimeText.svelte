<script lang="ts">
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import SessionStatusLabel from "./SessionStatusLabel.svelte";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import {
    BlockType,
    type ISessionInterval
  } from "$lib/client/types/pointron/session.type";
  import { deepCopy } from "$lib/shared/utils/obj.utils";
  import { SessionCompositionType } from "$lib/client/types/pointron/sessionComposition.type";
  export let parentBackgroundIndex: number = 1;
  export let size: Size = Size.md;
  $: splits = resolveSessionTime($sessionStore.intervals);

  function resolveSessionTime(intervals: ISessionInterval[]) {
    intervals = intervals.filter((x) => x.progress > 0);
    let focus = intervals
      .filter((x) => x.type === BlockType.FOCUS)
      .reduce((acc, curr) => acc + curr.duration * curr.progress, 0);
    let brek = intervals
      .filter((x) => x.type === BlockType.BREAK)
      .reduce((acc, curr) => acc + curr.duration * curr.progress, 0);
    return { focus, brek };
  }
  // $: console.log({
  //   splits,
  //   timeElapsed: $sessionStore.timeElapsed,
  //   intervals: deepCopy($sessionStore.intervals)
  // });
</script>

<div class="flex w-full flex-col items-center gap-3">
  <div class="flex flex-col gap-1">
    <SessionStatusLabel size={$view.isPortrait ? Size.sm : Size.md} />
    <div
      class="flex justify-center {size === Size.sm
        ? 'text-7xl font-medium'
        : 'text-9xl font-semibold'} {$sessionStore.timeRemainingToTakeBreak !=
        undefined && $sessionStore.timeRemainingToTakeBreak < 0
        ? 'text-ars1'
        : ''}"
    >
      {formatSeconds(
        $sessionStore.isSessionRunning
          ? $sessionStore.timeElapsed
          : splits.focus + splits.brek,
        TimeFormat.CLOCK
      )}
    </div>
  </div>
  <div
    class={cn(
      "flex justify-evenly rounded-md py-3 w-full",
      bg(parentBackgroundIndex),
      {
        "text-b3": $view.isPortrait,
        "text-b1": !$view.isPortrait
      }
    )}
  >
    <!-- <div class="font-medium">TOTALS</div> -->
    <div>
      Session: {formatSeconds($sessionStore.totalElapsed, TimeFormat.CLOCK)}
    </div>
    <div class="text-aps1">
      F: {formatSeconds(splits.focus, TimeFormat.CLOCK)}
      {#if $sessionStore.composition?.type == SessionCompositionType.TARGET_FOCUS}
        / {formatSeconds(
          $sessionStore.composition.focusDuration,
          TimeFormat.CLOCK
        )}
      {/if}
    </div>
    <div class="text-ass1">
      B: {formatSeconds(splits.brek, TimeFormat.CLOCK)}
    </div>
  </div>
</div>
