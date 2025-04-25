<script lang="ts">
  import "../app.css";
  import { cn } from "$lib/client/utils/ui.utils";
  import ThemeLayer from "../layout/layers/themeLayer/ThemeLayer.svelte";
  // import AnalyticsLayer from "../layout/layers/analytics/AnalyticsLayer.svelte";
  import MetadataLayer from "../layout/layers/MetadataLayer.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import DynamicMetadataLayer from "../layout/layers/DynamicMetadataLayer.svelte";
  import type { IMetadata } from "../layout/metadata.type";
  export let metadata: IMetadata;
  export let bgColor: string = "bg-bgs1";
</script>

<div
  class={cn(
    "dark text-base text-fgs1 relative w-screen h-screen flex",
    $appearance.theme,
    $appearance.colorScheme?.tailwindSelector,
    bgColor
  )}
>
  <DynamicMetadataLayer {metadata} />
  <MetadataLayer />
  <!-- <AnalyticsLayer isLanding={true} /> -->
  <ThemeLayer>
    <slot />
  </ThemeLayer>
</div>
