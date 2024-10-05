<script lang="ts">
  import { onMount } from "svelte";
  import posthog from "posthog-js";
  onMount(() => {
    initializePosthog(import.meta.env.VITE_POSTHOG_PROJECT_KEY);
  });

  function initializePosthog(projectKey: string) {
    if (!projectKey) return;
    posthog.init(projectKey, {
      api_host: "https://us.i.posthog.com"
      // person_profiles: "identified_only"
    });
  }
</script>
