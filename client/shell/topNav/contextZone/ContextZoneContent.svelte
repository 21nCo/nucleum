<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    contextZone,
    getContextZonePane,
    type ContextZoneViews
  } from "@nucleum/shell/topNav/contextZone/context-zone";

  let {
    children,
    views = undefined,
    surface = undefined,
    title = undefined,
    fallback = undefined,
    isInlineFallback = true
  }: {
    /** Controls shown in the top bar context zone for this pane. */
    children: Snippet;
    /** Views the keyboard can move between while this entry shows. */
    views?: ContextZoneViews;
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

  $effect(() => {
    if (!$isHosted) return;
    return contextZone.register(pane, {
      get content() {
        return children;
      },
      get views() {
        return views;
      },
      get surface() {
        return surface;
      },
      get title() {
        return title;
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
