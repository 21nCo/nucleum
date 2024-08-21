<script lang="ts">
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { Size } from "$lib/client/types/size.enum";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import SessionTimeText from "./sessionTimeText/SessionTimeText.svelte";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { PointronEvent } from "$lib/client/types/pointron/pointronEvent.enum";
  onMount(() => {
    const sub = sessionStore.subscribe((x) => {
      if (x.state === SessionState.BREAK_RUNNING) {
        modalEvent.hide(PointronEvent.BREAK_REMINDER);
      }
    });
    return () => {
      sub();
    };
  });
</script>

<div
  class="flex flex-col w-full gap-12 p-4 items-center justify-center text-center"
>
  <div class="flex flex-col gap-2">
    <div>
      Its been <strong>{formatSeconds($sessionStore.timeElapsed)}</strong> since
      your last break.
    </div>
    <div class="text-b2 text-fgs3">
      To maintain optimal focus and well-being, consider taking a short break
      now.
    </div>
  </div>
  <div class="flex flex-col w-full items-center gap-4">
    <SessionTimeText size={Size.sm} parentBackgroundIndex={1} />
  </div>
</div>
