<script lang="ts">
  import { userPreferences } from "$lib/client/stores/app.store";
  import { onMount } from "svelte";
  import AnalyticsTags from "./AnalyticsTags.svelte";
  import posthog from "posthog-js";

  let isAnalyticsTagsMapped = false;
  onMount(() => {
    if ($userPreferences?.isAnonymousAnalyticsEnabled) {
      localStorage.removeItem("gaTag");
      localStorage.removeItem("clarityTag");
      const gaTag = import.meta.env.VITE_GA_TAG;
      const clarityTag = import.meta.env.VITE_CLARITY_TAG;
      if (gaTag) {
        localStorage.setItem("gaTag", gaTag);
      }
      if (clarityTag) {
        localStorage.setItem("clarityTag", clarityTag);
      }
      isAnalyticsTagsMapped = true;
      initializePosthog(import.meta.env.VITE_POSTHOG_PROJECT_KEY);
    }
  });

  function initializePosthog(projectKey: string) {
    if (!projectKey) return;
    posthog.init(projectKey, {
      api_host: "https://us.i.posthog.com"
      // person_profiles: "identified_only"
    });
  }
</script>

{#if isAnalyticsTagsMapped}
  <AnalyticsTags />
{/if}
