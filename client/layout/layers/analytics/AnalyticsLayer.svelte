<script lang="ts">
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { onMount } from "svelte";
  import AnalyticsTags from "./AnalyticsTags.svelte";
  import posthog from "posthog-js";
  export let isLanding: boolean = false;
  let isAnalyticsTagsMapped = false;
  onMount(() => {
    if ($userPreferences?.isAnonymousAnalyticsEnabled || isLanding) {
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
    return () => {
      posthog.reset();
    };
  });

  function initializePosthog(projectKey: string) {
    if (!projectKey) return;
    posthog.init(projectKey, {
      api_host: "https://us.i.posthog.com",
      // person_profiles: "identified_only"
      session_recording: {
        maskTextSelector: ".email, .sensitive, .userdata"
      }
    });
  }
</script>

{#if isAnalyticsTagsMapped}
  <AnalyticsTags />
{/if}
