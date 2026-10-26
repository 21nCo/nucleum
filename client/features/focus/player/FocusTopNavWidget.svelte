<svelte:options runes={true} />

<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import { PointronAction } from "@nucleum/client/config/focus-action.enum";

  import { activeSession } from "@nucleum/features/focus/session.store";
  import { TimeFormat } from "@21n/shared-utils/datetime/duration.type";
  import { formatSeconds } from "@21n/ui/elements/time/duration-format";
  import { tooltip } from "@21n/ui/actions/popover.action";
  import { cn } from "@21n/ui/environment/presentation";
  import { SessionState } from "@nucleum/features/focus/sessionState.enum";
  import TopNavLeftMenuItem from "@nucleum/shell/topNav/TopNavLeftMenuItem.svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
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
    onclick={() => {
      requireCommandHost().runAction(action);
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
  <TopNavLeftMenuItem {action} tooltip="Open focus" ariaLabel="Focus" />
{/if}
