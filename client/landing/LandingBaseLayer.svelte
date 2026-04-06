<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { cn } from "@21n/utils/ui.utils";
  import LandingThemeLayer from "@21n/landing/LandingThemeLayer.svelte";
  // import AnalyticsLayer from "../layout/layers/analytics/AnalyticsLayer.svelte";
  import MetadataLayer from "@21n/layout/layers/MetadataLayer.svelte";
  import appearance from "@21n/stores/appearance.store";
  import context from "@21n/stores/context.store";
  import { detectSystemOS, detectTouchDevice } from "@21n/utils/browser.utils";
  import PosthogTelemetry from "@21n/layout/layers/analytics/PosthogTelemetry.svelte";
  import BottomModal from "@21n/components/bottomModal/BottomModal.svelte";
  import { landing } from "@21n/landing/shared/store/shared.store";
  let {
    bgColor = "bg-bgs1",
    children
  }: {
    bgColor?: string;
    children?: Snippet;
  } = $props();

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

  function handleInlineLinkClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.matches("placeholder.inline-link")) {
      event.preventDefault();
      landing.openLink(target.getAttribute("data-href") ?? "");
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
  <MetadataLayer />
  <PosthogTelemetry />
  <!-- <AnalyticsLayer isLanding={true} /> -->
  <LandingThemeLayer>
    <div class="flex w-full h-full">
      {@render children?.()}
    </div>
  </LandingThemeLayer>
  <BottomModal />
</div>
<svelte:document onclick={handleInlineLinkClick} />
