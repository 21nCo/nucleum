<script lang="ts">
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import { appStore } from "@21n/stores/app.store";
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import { TimeFormat } from "@21n/types/time.type";
  import { formatSeconds } from "@21n/utils/time.utils";
  import { tooltip } from "@21n/actions/popover.action";
  import { cn } from "@21n/utils/ui.utils";
  import { SessionState } from "@21n/types/pointron/sessionState.enum";
  import TopNavLeftMenuItem from "@21n/layout/topNav/TopNavLeftMenuItem.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  const action = PointronAction.FOCUS;
</script>

{#if $activeSession.isSessionRunning}
  <button
    class={cn(
      "flex items-center gap-1 tabular-nums text-b3 font-mono border hover:bg-bgs3 py-1 px-2 mx-2 rounded-md",
      {
        "text-aps1 border-aps1":
          $activeSession.state === SessionState.FOCUS_RUNNING,
        "text-ass1 border-ass1":
          $activeSession.state === SessionState.BREAK_RUNNING
      }
    )}
    on:click={() => {
      appStore.runAction(action);
    }}
    use:tooltip={{
      text: "Open focus"
    }}
  >
    <Icon
      icon="focus"
      size={Size.sm}
      class={cn({
        "text-aps1": $activeSession.state === SessionState.FOCUS_RUNNING,
        "text-ass1": $activeSession.state === SessionState.BREAK_RUNNING
      })}
    />
    {formatSeconds($activeSession.timeElapsed, TimeFormat.CLOCK)}
  </button>
{:else}
  <TopNavLeftMenuItem {action} />
{/if}
