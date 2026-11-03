<svelte:options runes={true} />

<script lang="ts">
  import { cn } from "@21n/ui/environment/presentation";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
  import { resolveRightPanelWidthClass } from "@nucleum/shell/rightPanel/right-panel-width";
  import {
    PANEL_ACTION_EASING,
    PANEL_ACTION_TRANSITION_MS,
    isReducedMotion,
    resolveFlipKeyframes
  } from "@nucleum/shell/topNav/panel-action-motion";
  import {
    resolveExpandedBorderClass,
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

  let groupRef = $state<HTMLDivElement | undefined>(undefined);
  let restingRects: Map<string, { left: number; width: number }> | undefined;
  let restingAction: string | undefined;

  function readRects() {
    const rects = new Map<string, { left: number; width: number }>();
    if (!groupRef) return rects;
    const group = groupRef.getBoundingClientRect();
    rects.set("", { left: group.left, width: group.width });
    for (const element of groupRef.querySelectorAll<HTMLElement>(
      "[data-action]"
    )) {
      const rect = element.getBoundingClientRect();
      rects.set(element.dataset.action!, {
        left: rect.left,
        width: rect.width
      });
    }
    return rects;
  }

  $effect(() => {
    const action = expandedAction;
    if (!groupRef) return;
    const previous = restingRects;
    const isChanged = previous !== undefined && action !== restingAction;
    const current = readRects();
    restingRects = current;
    restingAction = action;
    if (!isChanged || isReducedMotion()) return;
    const options = {
      duration: PANEL_ACTION_TRANSITION_MS,
      easing: PANEL_ACTION_EASING
    };
    const groupFrames = resolveFlipKeyframes(
      previous.get("")!,
      current.get("")!
    );
    if (groupFrames) groupRef.animate(groupFrames, options);
    for (const element of groupRef.querySelectorAll<HTMLElement>(
      "[data-action]"
    )) {
      const before = previous.get(element.dataset.action!);
      const after = current.get(element.dataset.action!);
      if (!before || !after) continue;
      const frames = resolveFlipKeyframes(
        { left: before.left - previous.get("")!.left, width: before.width },
        { left: after.left - current.get("")!.left, width: after.width }
      );
      if (frames) element.animate(frames, options);
      if (element.dataset.state === "expanded")
        element.firstElementChild?.animate([{ opacity: 0 }, { opacity: 1 }], {
          ...options,
          duration: PANEL_ACTION_TRANSITION_MS * 0.8
        });
    }
  });

  $effect(() => {
    if (!groupRef) return;
    const observer = new ResizeObserver(() => {
      if (groupRef && groupRef.getAnimations().length === 0)
        restingRects = readRects();
    });
    observer.observe(groupRef);
    return () => observer.disconnect();
  });
</script>

<div
  bind:this={groupRef}
  class={cn(
    "flex shrink-0",
    expandedAction
      ? [
          "relative z-10 self-start h-[calc(100%+1px)] -mb-px border-l border-b border-brs3 bg-bgs2",
          widthClass
        ]
      : "items-stretch self-stretch"
  )}
  data-testid="top-bar-panel-actions"
  data-expanded={expandedAction}
>
  {#each actions as item, index (item.action)}
    <div
      class={cn(
        "flex items-center h-full",
        states[item.action] === "expanded"
          ? [
              "flex-1 min-w-0 border-brs3",
              resolveExpandedBorderClass(index, actions.length)
            ]
          : "shrink-0"
      )}
      data-testid="top-bar-panel-action"
      data-action={item.action}
      data-state={states[item.action]}
    >
      {@render item.content(states[item.action])}
    </div>
  {/each}
</div>
