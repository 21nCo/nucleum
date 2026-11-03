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
    /** Quick actions that open in the right panel, in display order; the expanded one moves to the end, above its panel. */
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
  const orderedActions = $derived([
    ...actions.filter((item) => item.action !== expandedAction),
    ...actions.filter((item) => item.action === expandedAction)
  ]);
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
  class="flex items-stretch self-stretch shrink-0"
  data-testid="top-bar-panel-actions"
  data-expanded={expandedAction}
>
  {#each orderedActions as item (item.action)}
    <div
      class={cn(
        "flex items-center",
        states[item.action] === "expanded"
          ? [
              "relative z-10 h-[calc(100%+1px)] -mb-px border-l border-brs3",
              item.surfaceClass ?? "bg-bgs2",
              widthClass
            ]
          : "h-full shrink-0"
      )}
      data-testid="top-bar-panel-action"
      data-action={item.action}
      data-state={states[item.action]}
    >
      {@render item.content(states[item.action])}
    </div>
  {/each}
</div>
