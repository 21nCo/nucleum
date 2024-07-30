<script lang="ts">
  import { onMount } from "svelte";
  import ThemeLayer from "../layout/layers/themeLayer/ThemeLayer.svelte";
  import { Persistence } from "$lib/client/persistence/persistence";
  import { appStore } from "$lib/client/stores/app.store";
  import AnalyticsLayer from "../layout/layers/analytics/AnalyticsLayer.svelte";
  import MetadataLayer from "../layout/layers/MetadataLayer.svelte";
  onMount(async () => {
    await new Persistence().fetchAppData();
  });
</script>

<MetadataLayer />
{#if $appStore?.appData?.isAnalyticsEnabled}
  <AnalyticsLayer />
{/if}
<ThemeLayer>
  <slot />
</ThemeLayer>
