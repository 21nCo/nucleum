<script lang="ts">
  import { onMount } from "svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  onMount(() => {
    setTimeout(() => {
      modalEvent.hideSpecific(PointronAction.PREDEFINED_INTERVAL_NOTIFIER);
    }, 4000);
  });
</script>

<div
  class={cn("flex w-full h-full items-center justify-center p-4 text-abg", {
    "bg-ass1": $sessionStore.state === SessionState.BREAK_RUNNING,
    "bg-aps1": $sessionStore.state === SessionState.FOCUS_RUNNING
  })}
>
  <!-- TODO - Add illustrations -->
  {#if $sessionStore.state === SessionState.BREAK_RUNNING}
    BREAK STARTED
  {:else}
    FOCUS STARTED
  {/if}
</div>
