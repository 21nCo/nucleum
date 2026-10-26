import posthog from "posthog-js";
import { stringify } from "@21n/shared-utils/json.utils";
/** Installs telemetry error capture and returns its lifecycle cleanup. */
export function installPosthogTelemetry() {
  initializePosthog(import.meta.env.VITE_POSTHOG_PROJECT_KEY);
  window.addEventListener("errorLog", handleError as EventListener);
  return () => {
    window.removeEventListener("errorLog", handleError as EventListener);
    posthog.reset();
  };
}

function initializePosthog(projectKey: string) {
  if (!projectKey) return;
  posthog.init(projectKey, {
    api_host: "https://us.i.posthog.com",

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
