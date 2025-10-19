<script lang="ts">
  import {
    activeSession,
    currentFocusItem
  } from "@21n/products/pointron/focus/session.store";
  import { SessionUIContext } from "@21n/types/pointron/session.type";
  import { SessionState } from "@21n/types/pointron/sessionState.enum";
  import { Size } from "@21n/types/size.enum";
  import { TimeFormat } from "@21n/types/time.type";
  import { formatSeconds } from "@21n/utils/time.utils";
  import { cn } from "@21n/utils/ui.utils";
  import { onMount } from "svelte";
  import SessionStatusLabel from "@21n/products/pointron/focus/elements/sessionTimeText/SessionStatusLabel.svelte";
  import { isSameResource } from "@21n/components/flux/resourceStores/resource.utils";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  export let context: SessionUIContext = SessionUIContext.DEFAULT;
  let currentTask: { id: IRecordId; label: string } | undefined = undefined;
  onMount(() => {
    const sub = currentFocusItem.subscribe(async (s) => {
      if (
        (s && currentTask && !isSameResource(currentTask, s)) ||
        !s ||
        (s && !currentTask)
      ) {
        refreshCurrentTask();
      }
    });
    return () => {
      sub();
    };
  });
  async function refreshCurrentTask() {
    const focusItem = $currentFocusItem;
    if (focusItem) {
      currentTask = await activeSession.resolveCurrentFocusItemData({
        item: focusItem
      });
    } else {
      currentTask = undefined;
    }
  }

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
          : (currentTask?.label ?? "")}
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
{#if currentTask}
  <ComponentBaseLayer
    subscribeToRecords={[currentTask?.id]}
    on:change={() => refreshCurrentTask()}
  />
{/if}
