<script lang="ts">
  import { onMount } from "svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import LandingThemeLayer from "./LandingThemeLayer.svelte";
  // import AnalyticsLayer from "../layout/layers/analytics/AnalyticsLayer.svelte";
  import MetadataLayer from "../layout/layers/MetadataLayer.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import DynamicMetadataLayer from "../layout/layers/DynamicMetadataLayer.svelte";
  import type { IMetadata } from "../layout/metadata.type";
  import context from "../stores/context.store";
  import { detectSystemOS, detectTouchDevice } from "../utils/browser.utils";
  import PosthogTelemetry from "../layout/layers/analytics/PosthogTelemetry.svelte";
  import BottomModal from "../components/bottomModal/BottomModal.svelte";
  export let metadata: IMetadata;
  export let bgColor: string = "bg-bgs1";

  onMount(() => {
    setContext();
  });

  function setContext() {
    let browserAgent = navigator?.userAgent;
    $context.os = detectSystemOS();
    $context.isTouchDevice = detectTouchDevice();
    if (typeof window !== "undefined") {
      $context.protocol = window.location.protocol;
    }
  }
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
  <PosthogTelemetry />
  <!-- <AnalyticsLayer isLanding={true} /> -->
  <LandingThemeLayer>
    <div class="flex w-full h-full">
      <slot />
    </div>
  </LandingThemeLayer>
  <BottomModal />
</div>
