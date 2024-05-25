<script lang="ts">
  import { onMount } from "svelte";
  import ThemeLayer from "./ThemeLayer.svelte";
  import { Persistance } from "$lib/client/stores/persistance";
  import { appStore } from "$lib/client/stores/app.store";
  import AnalyticsLayer from "./analytics/AnalyticsLayer.svelte";
  onMount(async () => {
    await new Persistance().initializeAppData();
  });
</script>

<svelte:head>
  <title>{$appStore?.appData?.name ?? ""}</title>
  <meta
    name="description"
    content={$appStore?.appData?.meta?.description ?? ""}
  />
  <meta name="keywords" content={$appStore?.appData?.meta?.keywords ?? ""} />
  <meta name="robots" content="index, follow" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={$appStore?.appData?.meta?.url ?? ""} />
  <meta property="og:title" content={$appStore?.appData?.name ?? ""} />
  <meta
    property="og:description"
    content={$appStore?.appData?.meta?.description ?? ""}
  />
  <meta property="og:image" content={$appStore?.appData?.meta?.image ?? ""} />

  <!-- Twitter -->
  <meta
    property="twitter:card"
    content={$appStore?.appData?.meta?.twitterCard ?? ""}
  />
  <meta property="twitter:url" content={$appStore?.appData?.meta?.url ?? ""} />
  <meta property="twitter:title" content={$appStore?.appData?.name ?? ""} />
  <meta
    property="twitter:description"
    content={$appStore?.appData?.meta?.description ?? ""}
  />
  <meta
    property="twitter:image"
    content={$appStore?.appData?.meta?.image ?? ""}
  />
</svelte:head>

{#if $appStore?.appData?.isAnalyticsEnabled}
  <AnalyticsLayer />
{/if}
<ThemeLayer>
  <slot />
</ThemeLayer>
