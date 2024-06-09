<script lang="ts">
  import { onMount } from "svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  onMount(() => {
    setTimeout(() => {
      modalEvent.hideSpecific(PointronEventEnum.PREDEFINED_INTERVAL_NOTIFIER);
    }, 2000);
  });
</script>

<div class="flex w-full h-full items-center justify-center p-4">
  <!-- TODO - Add illustrations -->
  {#if $sessionStore.state === SessionState.BREAK_RUNNING}
    BREAK STARTED
  {:else}
    FOCUS STARTED
  {/if}
</div>
