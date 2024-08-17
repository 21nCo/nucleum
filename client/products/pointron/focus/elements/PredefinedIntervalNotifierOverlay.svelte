<script lang="ts">
  import { onMount } from "svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { tweened } from "svelte/motion";
  import { linear } from "svelte/easing";

  const duration = 4000; // 4 seconds
  const progress = tweened(100, {
    duration,
    easing: linear
  });

  onMount(() => {
    progress.set(0);
    const timer = setTimeout(() => {
      modalEvent.hide(PointronAction.PREDEFINED_INTERVAL_NOTIFIER_OVERLAY);
    }, duration);
    return () => clearTimeout(timer);
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
  <div
    class={cn("absolute bottom-0 left-0 w-full h-2", {
      "bg-ass1": $sessionStore.state === SessionState.BREAK_RUNNING,
      "bg-aps1": $sessionStore.state === SessionState.FOCUS_RUNNING
    })}
  >
    <div
      class={cn("h-full transition-all duration-100 ease-linear", {
        "bg-ass2": $sessionStore.state === SessionState.BREAK_RUNNING,
        "bg-aps2": $sessionStore.state === SessionState.FOCUS_RUNNING
      })}
      style="width: {$progress}%;"
    ></div>
  </div>
</div>
