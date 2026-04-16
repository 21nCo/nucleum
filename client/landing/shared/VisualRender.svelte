<script lang="ts">
  import BuildToLast from "@21n/landing/shared/highlights/visuals/BuildToLast.svelte";
  import DatabaseIcon from "@21n/landing/shared/highlights/visuals/DatabaseIcon.svelte";
  import AInative from "@21n/landing/shared/highlights/visuals/AInative.svelte";
  import NetworkIcon from "@21n/landing/shared/highlights/visuals/NetworkIcon.svelte";
  import Security from "@21n/landing/shared/highlights/visuals/SecurityVisual.svelte";
  import UIVisual from "@21n/landing/shared/highlights/visuals/UIVisual.svelte";
  import CollectionsGraph from "@21n/landing/shared/highlights/visuals/CollectionsGraph.svelte";
  import PointronFeatures from "@21n/landing/shared/highlights/visuals/PointronFeatures.svelte";
  import ContinueOffline from "@21n/landing/shared/highlights/visuals/ContinueOffline.svelte";
  import FocusFeature from "@21n/landing/shared/features/visuals/FocusFeature.svelte";
  import AnalyticsFeature from "@21n/landing/shared/features/visuals/AnalyticsFeature.svelte";
  import GoalsFeature from "@21n/landing/shared/features/visuals/GoalsFeature.svelte";
  import PointronIntuitive from "@21n/landing/shared/highlights/visuals/PointronIntuitive.svelte";
  import MemotronFeaturesRadial from "@21n/landing/shared/highlights/visuals/MemotronFeaturesRadial.svelte";
  import CaptureFeature from "@21n/landing/shared/features/visuals/CaptureFeature.svelte";
  import ClipFeature from "@21n/landing/shared/features/visuals/ClipFeature.svelte";
  import SynthesizeFeature from "@21n/landing/shared/features/visuals/SynthesizeFeature.svelte";
  import OrganizeFeature from "@21n/landing/shared/features/visuals/OrganizeFeature.svelte";
  let {
    name,
  }: {
    name: string;
  } = $props();

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
    captureFeature: CaptureFeature,
    clipFeature: ClipFeature,
    organizeFeature: OrganizeFeature,
    synthesizeFeature: SynthesizeFeature,
    analyticsFeature: AnalyticsFeature,
    pointronIntuitive: PointronIntuitive,
    memotronFeaturesRadial: MemotronFeaturesRadial
  };
</script>

{#if name in componentMap}
  {@const Component = componentMap[name]}
  <Component />
{:else}
  <div class="text-sm text-fgs4">-</div>
{/if}
