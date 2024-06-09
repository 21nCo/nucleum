<script lang="ts">
  import { sessionStore } from "$lib/client/components/pointron/focus/session.store";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import SessionTimeText from "./sessionTimeText/SessionTimeText.svelte";
</script>

<div
  class="flex flex-col w-full gap-12 p-4 items-center justify-center text-center"
>
  <div>
    Its been <strong>{formatSeconds($sessionStore.timeElapsed)}</strong> since your
    last break. To maintain optimal focus and well-being, consider taking a short
    break now.
  </div>
  <div class="flex flex-col w-full items-center gap-4">
    <SessionTimeText size={Size.sm} parentBackgroundIndex={1} />
  </div>
  <InlineInfoBanner
    content="Feel free to continue working if you're in the flow, but remember that
  regular breaks can boost your productivity and creativity in the long run."
  />
</div>
