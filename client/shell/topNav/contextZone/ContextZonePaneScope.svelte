<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { onDestroy, onMount, untrack } from "svelte";
  import {
    contextZone,
    setContextZonePane
  } from "@nucleum/shell/topNav/contextZone/context-zone";

  let {
    id,
    layer,
    isActivateOnMount = true,
    children
  }: {
    id: string;
    layer: number;
    /** Makes this pane the active one as soon as it appears. */
    isActivateOnMount?: boolean;
    children?: Snippet;
  } = $props();

  const paneId = untrack(() => id);
  setContextZonePane({ id: paneId, layer: untrack(() => layer) });

  onMount(() => {
    if (isActivateOnMount) contextZone.activatePane(paneId);
  });

  onDestroy(() => {
    contextZone.releasePane(paneId);
  });
</script>

<div
  class="contents"
  data-context-zone-pane={paneId}
  onpointerdowncapture={() => contextZone.activatePane(paneId)}
  onfocusin={() => contextZone.activatePane(paneId)}
>
  {@render children?.()}
</div>
