<script lang="ts">
  import { appStore, userPreferences } from "$lib/tidy/stores/app.store";
  import { onMount } from "svelte";
  import AnalyticsTags from "./AnalyticsTags.svelte";
  let isAnalyticsTagsMapped = false;
  onMount(() => {
    if (
      $appStore?.appData?.isAnalyticsEnabled &&
      $userPreferences?.isAnonymousAnalyticsEnabled
    ) {
      const host = window.location.host;
      localStorage.removeItem("gaTag");
      localStorage.removeItem("clarityTag");
      const gaTag =
        $appStore.appData?.gaTag ??
        $appStore.appData?.gaTags?.find((ga: any) => ga.host === host)?.tag;
      if (gaTag) {
        localStorage.setItem("gaTag", gaTag);
      }
      const clarityTag =
        $appStore.appData?.clarityTag ??
        $appStore.appData?.clarityTags?.find(
          (clarity: any) => clarity.host === host
        )?.tag;
      if (clarityTag) {
        localStorage.setItem("clarityTag", clarityTag);
      }
      isAnalyticsTagsMapped = true;
    }
  });
</script>

{#if $appStore?.appData?.isAnalyticsEnabled && isAnalyticsTagsMapped}
  <AnalyticsTags />
{/if}
