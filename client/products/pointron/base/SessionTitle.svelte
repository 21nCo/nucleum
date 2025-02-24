<script>
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { TimeFormat } from "$lib/client/types/time.type";

  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { activeSession } from "../focus/session.store";
</script>

<svelte:head>
  <title
    >{formatSeconds($activeSession.timeElapsed, TimeFormat.CLOCK)}
    [{$activeSession.state === SessionState.FOCUS_RUNNING ? "Focus" : "Break"}]
    - Pointron</title
  >
</svelte:head>
