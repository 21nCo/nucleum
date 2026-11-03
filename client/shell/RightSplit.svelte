<script lang="ts">
  import { cubicOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import ResourceResolver from "@nucleum/shell/paint/ResourceResolver.svelte";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import ContextZonePaneScope from "@nucleum/shell/topNav/contextZone/ContextZonePaneScope.svelte";
  import { ContextZoneLayer } from "@nucleum/shell/topNav/contextZone/context-zone";
  let {
    split,
    accessMode = AccessMode.BESIDE_BASE
  }: {
    split: string;
    accessMode?: AccessMode;
  } = $props();
</script>

<div
  transition:fly={{ x: 1000, opacity: 0, easing: cubicOut }}
  class="flex h-full flex-1 min-w-0 max-w-1/3 bg-bgs1"
>
  <div class="w-1 bg-bgs2-striped border-x border-brs2"></div>
  {#key split}
    <ContextZonePaneScope
      id={accessMode}
      layer={accessMode === AccessMode.BESIDE_PAGE
        ? ContextZoneLayer.BESIDE_PAGE
        : ContextZoneLayer.BESIDE_BASE}
    >
      <ResourceResolver id={split} isFromSplitView={true} {accessMode} />
    </ContextZonePaneScope>
  {/key}
</div>
