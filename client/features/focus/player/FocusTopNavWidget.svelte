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
  import { page } from "$app/stores";
  import view from "@21n/ui/environment/view.store";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import {
    isTopNavPanelBeside,
    type TopNavPanelActionState
  } from "@nucleum/shell/topNav/panel-actions";
  let {
    mode = "action",
    state = "idle"
  }: {
    /**
     * `indicator` renders the running session timer only; `action` renders the
     * focus quick action, expanded with its label and timer while the focus
     * panel is open.
     */
    mode?: "indicator" | "action";
    /** State of the focus action in the top bar panel action group. */
    state?: TopNavPanelActionState;
  } = $props();
  const action = PointronAction.FOCUS;
  const isPanelExpanded = $derived(
    $page.url.searchParams.get(AccessMode.PANEL) === action &&
      isTopNavPanelBeside($view)
  );
</script>

{#snippet timer()}
  <span
    class={cn("tabular-nums text-b3 font-mono", {
      "text-aps1": $activeSession.state === SessionState.FOCUS_RUNNING,
      "text-ass1": $activeSession.state === SessionState.BREAK_RUNNING
    })}
    data-testid="focus-top-nav-timer"
  >
    {formatSeconds($activeSession.timeElapsed, TimeFormat.CLOCK)}
  </span>
{/snippet}

{#if mode === "indicator"}
  {#if $activeSession.isSessionRunning && !isPanelExpanded}
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
  {/if}
{:else}
  <TopNavLeftMenuItem
    {action}
    tooltip="Open focus"
    ariaLabel="Focus"
    label={state === "expanded" ? "Focus" : undefined}
    isExpanded={state === "expanded"}
    trailing={state === "expanded" && $activeSession.isSessionRunning
      ? timer
      : undefined}
  />
{/if}
