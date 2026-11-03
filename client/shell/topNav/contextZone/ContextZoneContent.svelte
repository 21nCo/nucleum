<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    contextZone,
    getContextZonePane
  } from "@nucleum/shell/topNav/contextZone/context-zone";

  let {
    children,
    cycle = undefined,
    surface = undefined,
    fallback = undefined,
    isInlineFallback = true
  }: {
    /** Controls shown in the top bar context zone for this pane. */
    children: Snippet;
    /** Selects the next tab or view of this entry. */
    cycle?: () => void;
    /** Background class of the context tab, matching the page below. */
    surface?: string;
    /** Renders in place of `children` when no top bar hosts the zone. */
    fallback?: Snippet;
    /** Renders the controls in place when no top bar hosts the zone. */
    isInlineFallback?: boolean;
  } = $props();

  const pane = getContextZonePane();
  const isHosted = contextZone.isHosted;

  $effect(() => {
    if (!$isHosted) return;
    return contextZone.register(pane, {
      get content() {
        return children;
      },
      get cycle() {
        return cycle;
      },
      get surface() {
        return surface;
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
