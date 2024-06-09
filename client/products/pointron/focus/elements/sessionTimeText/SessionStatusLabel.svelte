<script lang="ts">
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { BlockType } from "$lib/client/types/pointron/session.type";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { SessionType } from "$lib/client/products/pointron/logs/log.type";
  import { Size } from "$lib/client/types/size.enum";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  export let size: Size = Size.md;
  export let isDefaultColor: boolean = false;
  $: extentionElapsed =
    $sessionStore.type === SessionType.COUNTDOWN &&
    $sessionStore.plannedDuration
      ? $sessionStore.totalElapsed -
        ($sessionStore.plannedDuration - $sessionStore.totalExtended)
      : 0;
  $: labelClasses =
    `text-center ${size === Size.md ? "font-medium p-3 text-h3" : "text-b2"} ` +
    (!isDefaultColor
      ? $sessionStore.currentBlock.type === BlockType.FOCUS
        ? "text-aps1"
        : $sessionStore.currentBlock.type === BlockType.BREAK
          ? "text-ass1"
          : "text-accent3"
      : "");
  $: sessionLabel =
    $sessionStore.state === SessionState.FINISHED
      ? "SESSION FINISHED"
      : $sessionStore.state === SessionState.TIME_IS_UP
        ? "TIME UP"
        : $sessionStore.state === SessionState.FOCUS_COMPLETED
          ? "INTERVAL COMPLETED"
          : $sessionStore.state === SessionState.BREAK_COMPLETED
            ? "BREAK COMPLETED"
            : $sessionStore.state === SessionState.BREAK_RUNNING
              ? "CURRENT BREAK"
              : "CURRENT FOCUS";
</script>

<div class={labelClasses}>
  {sessionLabel}
  {#if extentionElapsed && extentionElapsed > 0 && $sessionStore.isSessionRunning}
    | extended: {formatSeconds(extentionElapsed)}
  {/if}
</div>
