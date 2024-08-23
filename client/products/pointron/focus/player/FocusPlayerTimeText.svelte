<script lang="ts">
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { SessionUIContext } from "$lib/client/types/pointron/session.type";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import SessionStatusLabel from "../elements/sessionTimeText/SessionStatusLabel.svelte";
  export let context: SessionUIContext = SessionUIContext.DEFAULT;
  $: currentTask = sessionStore.resolveCurrentTask($sessionStore.currentTask);
  $: isBreakReminderMode =
    $sessionStore.timeRemainingToTakeBreak != undefined &&
    $sessionStore.timeRemainingToTakeBreak < 0;
</script>

<div class="flex flex-col items-start w-full">
  <div class="flex-1 min-w-0 w-full text-start">
    {#if isBreakReminderMode}
      <div class="animate-pulse">BREAK REMINDER</div>
    {:else if currentTask?.label && $sessionStore.state === SessionState.FOCUS_RUNNING}
      <div
        class={cn("text-left truncate", {
          "text-ccs1": context === SessionUIContext.PIP
        })}
      >
        {currentTask?.label ?? ""}
      </div>
    {:else}
      <SessionStatusLabel
        size={Size.sm}
        isDefaultColor={context === SessionUIContext.FOCUS_PLAYER}
      />
    {/if}
  </div>
  <div class="font-semibold text-h2 leading-tight">
    {formatSeconds($sessionStore.timeElapsed, TimeFormat.CLOCK)}
  </div>
</div>
