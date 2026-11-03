<svelte:options runes={true} />

<script lang="ts">
  import { cn } from "@21n/ui/environment/presentation";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
  import { resolveRightPanelWidthClass } from "@nucleum/shell/rightPanel/right-panel-width";
  import {
    resolvePanelActionStates,
    type TopNavPanelAction
  } from "@nucleum/shell/topNav/panel-actions";

  let {
    actions,
    openPanel,
    isPanelBeside
  }: {
    /** Quick actions that open in the right panel, in display order. */
    actions: TopNavPanelAction[];
    /** Action whose panel is open, from the URL. */
    openPanel: string | null;
    /** Whether the right panel shows beside the content rather than as a sheet. */
    isPanelBeside: boolean;
  } = $props();

  const states = $derived(
    resolvePanelActionStates(
      actions.map((item) => item.action),
      openPanel,
      isPanelBeside
    )
  );
  const expandedAction = $derived(
    actions.find((item) => states[item.action] === "expanded")?.action
  );
  const widthClass = $derived(
    expandedAction
      ? resolveRightPanelWidthClass(
          requireCommandHost().resolveAction(expandedAction)?.liveActionParams
            ?.size
        )
      : undefined
  );
</script>

<div
  class={cn(
    "flex shrink-0",
    expandedAction
      ? [
          "relative z-10 self-start h-[calc(100%+1px)] -mb-px border-l border-brs3 bg-bgs2",
          widthClass
        ]
      : "items-stretch self-stretch"
  )}
  data-testid="top-bar-panel-actions"
  data-expanded={expandedAction}
>
  {#each actions as item (item.action)}
    <div
      class={cn(
        "flex items-center h-full",
        states[item.action] === "expanded" ? "flex-1 min-w-0" : "shrink-0"
      )}
      data-testid="top-bar-panel-action"
      data-action={item.action}
      data-state={states[item.action]}
    >
      {@render item.content(states[item.action])}
    </div>
  {/each}
</div>
