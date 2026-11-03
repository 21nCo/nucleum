<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    contextZone,
    getContextZonePane,
    getContextZoneTarget
  } from "@nucleum/shell/topNav/contextZone/context-zone";

  let {
    children,
    cycle = undefined,
    fallback = undefined,
    isInlineFallback = true
  }: {
    /** Controls shown in the top bar context zone for this pane. */
    children: Snippet;
    /** Selects the next tab or view of this entry. */
    cycle?: () => void;
    /** Renders in place of `children` when no top bar hosts the zone. */
    fallback?: Snippet;
    /** Renders the controls in place when no top bar hosts the zone. */
    isInlineFallback?: boolean;
  } = $props();

  const pane = getContextZonePane();
  const target = getContextZoneTarget();
  const isHosted = contextZone.isHosted;

  $effect(() => {
    if (!$isHosted) return;
    const registration = {
      get content() {
        return children;
      },
      get cycle() {
        return cycle;
      }
    };
    return target
      ? target.register(registration)
      : contextZone.register(pane, registration);
  });
</script>

{#if !$isHosted && isInlineFallback}
  {#if fallback}
    {@render fallback()}
  {:else}
    {@render children()}
  {/if}
{/if}
