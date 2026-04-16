<script lang="ts">
  import { onMount } from "svelte";
  import posthog from "posthog-js";
  import { stringify } from "@21n/shared-utils/json.utils";
  onMount(() => {
    initializePosthog(import.meta.env.VITE_POSTHOG_PROJECT_KEY);
    window.addEventListener("errorLog", handleError as EventListener);
    return () => {
      window.removeEventListener("errorLog", handleError as EventListener);
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

  function handleError(error: any) {
    try {
      posthog.captureException(
        error.detail?.message
          ? typeof error.detail.message === "string"
            ? error.detail.message
            : stringify(error.detail.message)
          : (error.detail?.error ?? error.detail?.message?.error ?? "Error")
      );
    } catch (e) {
      console.error("Error capturing error", e);
    }
  }
</script>
