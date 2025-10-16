import type { PlasmoCSConfig } from "plasmo";
import LinearTimer from "./content/linear-timer.svelte";

export const config: PlasmoCSConfig = {
  matches: ["https://linear.app/*"],
  all_frames: false,
};

/**
 * Content script entry point
 * Mounts the Svelte component to the page
 */
const mountExtension = () => {
  const container = document.createElement("div");
  container.id = "timear-extension-root";
  document.body.appendChild(container);

  new LinearTimer({
    target: container,
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountExtension);
} else {
  mountExtension();
}
