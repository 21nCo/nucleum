<svelte:options runes={true} />

<script lang="ts">
  import { untrack, type Snippet } from "svelte";
  import {
    contextZone,
    getContextZonePane
  } from "@nucleum/shell/topNav/contextZone/context-zone";

  let {
    children,
    cycle = undefined,
    surface = undefined,
    title = undefined,
    fallback = undefined,
    isInlineFallback = true
  }: {
    /** Controls shown in the top bar context zone for this pane. */
    children: Snippet;
    /** Selects the next tab or view of this entry. */
    cycle?: () => void;
    /** Background class of the context tab, matching the page below. */
    surface?: string;
    /** Replaces the page identity's title while this entry shows. */
    title?: Snippet;
    /** Renders in place of `children` when no top bar hosts the zone. */
    fallback?: Snippet;
    /** Renders the controls in place when no top bar hosts the zone. */
    isInlineFallback?: boolean;
  } = $props();

  const pane = getContextZonePane();
  const isHosted = contextZone.isHosted;

  // The top bar reads copies of the props, so it never re-evaluates values
  // derived inside this pane once the pane unmounts. For example, a node
  // page that unmounts as Minimize returns to a space would otherwise read
  // its released store and stop the space from rendering.
  let shownContent = $state.raw(untrack(() => children));
  let shownCycle = $state.raw(untrack(() => cycle));
  let shownSurface = $state.raw(untrack(() => surface));
  let shownTitle = $state.raw(untrack(() => title));
  $effect.pre(() => {
    shownContent = children;
    shownCycle = cycle;
    shownSurface = surface;
    shownTitle = title;
  });

  $effect(() => {
    if (!$isHosted) return;
    return contextZone.register(pane, {
      get content() {
        return shownContent;
      },
      get cycle() {
        return shownCycle;
      },
      get surface() {
        return shownSurface;
      },
      get title() {
        return shownTitle;
      }
    });
  });
</script>

{#if !$isHosted && isInlineFallback}
  {#if fallback}
    {@render fallback()}
  {:else}
    {@render children()}
  {/if}
{/if}
