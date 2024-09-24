<script>
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { TimeFormat } from "$lib/client/types/time.type";

  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { sessionStore } from "../focus/session.store";
</script>

<svelte:head>
  <title
    >{formatSeconds($sessionStore.timeElapsed, TimeFormat.CLOCK)}
    [{$sessionStore.state === SessionState.FOCUS_RUNNING ? "Focus" : "Break"}] -
    Pointron</title
  >
</svelte:head>
