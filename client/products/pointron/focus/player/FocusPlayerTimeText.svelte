<script lang="ts">
  import {
    activeSession,
    currentFocusItem
  } from "$lib/client/products/pointron/focus/session.store";
  import { SessionUIContext } from "$lib/client/types/pointron/session.type";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import SessionStatusLabel from "../elements/sessionTimeText/SessionStatusLabel.svelte";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  export let context: SessionUIContext = SessionUIContext.DEFAULT;
  let currentTask: any;
  onMount(() => {
    const sub = currentFocusItem.subscribe(async (s) => {
      if (s && !isSameResource(currentTask, s)) {
        currentTask = await activeSession.resolveCurrentFocusItemData({
          item: s
        });
      }
    });
    return () => {
      sub();
    };
  });

  $: isBreakReminderMode =
    $activeSession.timeRemainingToTakeBreak != undefined &&
    $activeSession.timeRemainingToTakeBreak < 0;
</script>

<div class="flex flex-col items-start w-full">
  <div class="flex-1 min-w-0 w-full text-start">
    {#if isBreakReminderMode}
      <div class="animate-pulse">BREAK REMINDER</div>
    {:else if currentTask?.label && $activeSession.state === SessionState.FOCUS_RUNNING}
      <div
        class={cn("text-left truncate text-b2 dp:text-base userdata", {
          "text-ccs1":
            context === SessionUIContext.PIP ||
            context === SessionUIContext.GOAL_PAGE
        })}
      >
        {context === SessionUIContext.GOAL_PAGE
          ? "Focusing now..."
          : currentTask?.label ?? ""}
      </div>
    {:else}
      <SessionStatusLabel
        size={Size.sm}
        isDefaultColor={context === SessionUIContext.FOCUS_PLAYER}
      />
    {/if}
  </div>
  <div class="font-semibold text-h2 leading-tight tabular-nums">
    {formatSeconds($activeSession.timeElapsed, TimeFormat.CLOCK)}
  </div>
</div>
