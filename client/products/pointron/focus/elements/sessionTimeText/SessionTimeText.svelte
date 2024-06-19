<script lang="ts">
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { BlockType } from "$lib/client/types/pointron/session.type";
  import { calculateTotalFocusAndBreak } from "$lib/client/products/pointron/pointron.utils";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import SessionStatusLabel from "./SessionStatusLabel.svelte";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  export let parentBackgroundIndex: number = 1;
  export let size: Size = Size.md;
  $: splits = calculateTotalFocusAndBreak($sessionStore.blocks);
  $: totalFocus =
    splits.focus +
    ($sessionStore.isSessionRunning &&
    $sessionStore.currentBlock?.type === BlockType.FOCUS
      ? $sessionStore.timeElapsed
      : 0);
  $: totalBreak =
    splits.brek +
    ($sessionStore.isSessionRunning &&
    $sessionStore.currentBlock?.type === BlockType.BREAK
      ? $sessionStore.timeElapsed
      : 0);
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
          : totalFocus + totalBreak,
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
      F: {formatSeconds(totalFocus, TimeFormat.CLOCK)}
    </div>
    <div class="text-ass1">
      B: {formatSeconds(totalBreak, TimeFormat.CLOCK)}
    </div>
  </div>
</div>
