<script lang="ts">
  import "../app.css";
  import { cn } from "$lib/client/utils/ui.utils";
  import ThemeLayer from "../layout/layers/themeLayer/ThemeLayer.svelte";
  // import AnalyticsLayer from "../layout/layers/analytics/AnalyticsLayer.svelte";
  import MetadataLayer from "../layout/layers/MetadataLayer.svelte";
  import appearance from "$lib/client/stores/appearance.store";
</script>

<div
  class={cn(
    "dark text-base text-fgs1 bg-bgs1 relative w-screen h-screen flex",
    $appearance.theme,
    $appearance.colorScheme.tailwindSelector
  )}
>
  <MetadataLayer />
  <!-- <AnalyticsLayer isLanding={true} /> -->
  <ThemeLayer>
    <slot />
  </ThemeLayer>
</div>

<style>
  @font-face {
    font-family: "Shared";
    src: url("/fonts/Share.ttf") format("truetype");
    font-weight: normal;
    font-style: normal;
  }
</style>
