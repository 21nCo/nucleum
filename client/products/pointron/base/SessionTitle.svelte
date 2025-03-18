<script>
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { TimeFormat } from "$lib/client/types/time.type";

  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { activeSession } from "../focus/session.store";
</script>

<svelte:head>
  {#if $activeSession.isSessionRunning}
    {#key $activeSession.timeElapsed}
      <title>
        {$activeSession.state === SessionState.FOCUS_RUNNING
          ? "Focus"
          : "Break"}: {formatSeconds(
          $activeSession.timeElapsed,
          TimeFormat.CLOCK
        )}
        - Pointron
      </title>
    {/key}
  {:else}
    <title>Pointron - Your focus haven</title>
  {/if}
</svelte:head>
