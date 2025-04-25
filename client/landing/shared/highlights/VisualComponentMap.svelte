<script lang="ts">
  import BuildToLast from "./visuals/BuildToLast.svelte";
  import DatabaseIcon from "./visuals/DatabaseIcon.svelte";
  import AInative from "./visuals/AInative.svelte";
  import NetworkIcon from "./visuals/NetworkIcon.svelte";
  import Security from "./visuals/security.svelte";
  import UIVisual from "./visuals/UIVisual.svelte";
  import CollectionsGraph from "./visuals/CollectionsGraph.svelte";

  export let name: string;

  const componentMap: Record<string, any> = {
    last: BuildToLast,
    DatabaseIcon: DatabaseIcon,
    ainative: AInative,
    NetworkIcon: NetworkIcon,
    security: Security,
    UIVisual: UIVisual,
    CollectionsGraph: CollectionsGraph
  };
</script>

{#if name in componentMap}
  <svelte:component this={componentMap[name]} />
{:else}
  <div class="text-sm text-gray-500">Component not found: {name}</div>
{/if}
