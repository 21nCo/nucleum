<script lang="ts">
  import BuildToLast from "./highlights/visuals/BuildToLast.svelte";
  import DatabaseIcon from "./highlights/visuals/DatabaseIcon.svelte";
  import AInative from "./highlights/visuals/AInative.svelte";
  import NetworkIcon from "./highlights/visuals/NetworkIcon.svelte";
  import Security from "./highlights/visuals/SecurityVisual.svelte";
  import UIVisual from "./highlights/visuals/UIVisual.svelte";
  import CollectionsGraph from "./highlights/visuals/CollectionsGraph.svelte";
  import PointronFeatures from "./highlights/visuals/PointronFeatures.svelte";
  import ContinueOffline from "./highlights/visuals/ContinueOffline.svelte";
  import FocusFeature from "./features/visuals/FocusFeature.svelte";
  import AnalyticsFeature from "./features/visuals/AnalyticsFeature.svelte";
  import GoalsFeature from "./features/visuals/GoalsFeature.svelte";
  import PointronIntuitive from "./highlights/visuals/PointronIntuitive.svelte";
  export let name: string;

  const componentMap: Record<string, any> = {
    last: BuildToLast,
    DatabaseIcon: DatabaseIcon,
    ainative: AInative,
    NetworkIcon: NetworkIcon,
    security: Security,
    UIVisual: UIVisual,
    CollectionsGraph: CollectionsGraph,
    pointronFeatures: PointronFeatures,
    continueOffline: ContinueOffline,
    focusFeature: FocusFeature,
    goalsFeature: GoalsFeature,
    analyticsFeature: AnalyticsFeature,
    pointronIntuitive: PointronIntuitive
  };
</script>

{#if name in componentMap}
  <svelte:component this={componentMap[name]} />
{:else}
  <div class="text-sm text-fgs4">-</div>
{/if}
