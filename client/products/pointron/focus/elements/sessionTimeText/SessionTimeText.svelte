<script lang="ts">
  import { activeSession } from "$lib/client/products/pointron/focus/session.store";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import SessionStatusLabel from "./SessionStatusLabel.svelte";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import { deepCopy } from "$lib/shared/utils/obj.utils";
  import { SessionCompositionType } from "$lib/client/types/pointron/sessionComposition.type";
  import { resolveSessionSplitFromIntervals } from "../../../pointron.utils";
  export let parentBackgroundIndex: number = 1;
  export let size: Size = Size.md;
  $: splits = resolveSessionSplitFromIntervals($activeSession.intervals);
  // $: console.log({
  //   splits,
  //   timeElapsed: $sessionStore.timeElapsed,
  //   intervals: deepCopy($sessionStore.intervals)
  // });
</script>

<div class="flex w-full flex-col items-center gap-3">
  <div class="flex flex-col items-center gap-1">
    <SessionStatusLabel size={$view.isPortrait ? Size.sm : Size.md} />
    <div
      class={cn("flex justify-center tabular-nums slashed-zero", {
        "text-5xl dp:text-7xl font-bold": size === Size.sm,
        "text-7xl dp:text-9xl font-black": size !== Size.sm,
        "text-ars1":
          $activeSession.timeRemainingToTakeBreak != undefined &&
          $activeSession.timeRemainingToTakeBreak < 0
      })}
    >
      {formatSeconds(
        $activeSession.isSessionRunning
          ? $activeSession.timeElapsed
          : splits.focus + splits.brek,
        TimeFormat.CLOCK
      )}
    </div>
  </div>
  <div
    class={cn(
      "flex justify-evenly rounded-md py-3 w-full mo:text-b3 text-b2 dp:text-base text-wrap tabular-nums",
      bg(parentBackgroundIndex)
    )}
  >
    <div>
      Session: {formatSeconds($activeSession.totalElapsed, TimeFormat.CLOCK)}
    </div>
    <div class="text-aps1">
      F: {formatSeconds(splits.focus, TimeFormat.CLOCK)}
      {#if $activeSession.composition?.type == SessionCompositionType.TARGET_FOCUS}
        / {formatSeconds(
          $activeSession.composition.focusDuration,
          TimeFormat.CLOCK
        )}
      {/if}
    </div>
    <div class="text-ass1">
      B: {formatSeconds(splits.brek, TimeFormat.CLOCK)}
    </div>
  </div>
</div>
