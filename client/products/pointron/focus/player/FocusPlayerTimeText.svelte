<script lang="ts">
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import SessionStatusLabel from "../elements/sessionTimeText/SessionStatusLabel.svelte";
  $: currentTask = sessionStore.resolveCurrentTask($sessionStore.currentTask);
</script>

<div class="flex flex-col items-start">
  <div class="flex w-48">
    {#if $sessionStore.timeRemainingToTakeBreak != undefined && $sessionStore.timeRemainingToTakeBreak < 0}
      <div class="animate-pulse">BREAK REMINDER</div>
    {:else if currentTask?.label && $sessionStore.state === SessionState.FOCUS_RUNNING}
      <div class="text-left truncate">
        {currentTask?.label ?? ""}
      </div>
    {:else}
      <SessionStatusLabel size={Size.sm} isDefaultColor={true} />
    {/if}
  </div>

  <div class="font-medium text-h3">
    {formatSeconds($sessionStore.timeElapsed, TimeFormat.CLOCK)}
  </div>
</div>
