<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    sessionStore,
    todayFocusStore
  } from "$lib/client/components/pointron/focus/session.store";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  onMount(() => {
    let timer = setInterval(() => {
      tick();
      if ($sessionStore.state === SessionState.FOCUS_RUNNING)
        todayFocusStore.incrementTodayFocus(0.1);
    }, 100);
    return () => {
      clearInterval(timer);
    };
  });
</script>

<div>
  &nbsp;{($todayFocusStore.focus / (60 * 60) ?? 0).toFixed(5)}&nbsp; hrs
</div>
