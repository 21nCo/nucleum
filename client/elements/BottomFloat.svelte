<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { player } from "@21n/components/modal/modal.store";
  import view from "@21n/stores/view.store";
  import { cn } from "@21n/utils/ui.utils";
  import { generateRandomId } from "@21n/shared-utils/crypto.utils";
  export let margin: string | undefined = undefined;
  export let zIndex: string = "z-20";
  export let containerId: string | undefined = undefined;
  let isAppMenuHidden: boolean = resolveIfAppMenuHidden();
  const fallbackContainerId = generateRandomId();
  let classList: string = "";
  export { classList as class };
  let ref: HTMLElement;
  let portal: HTMLElement | undefined = undefined;

  onMount(() => {
    isAppMenuHidden = resolveIfAppMenuHidden();
    if (!classList.includes("justify")) {
      classList += " justify-center";
    }
    const finalContainerId = containerId || fallbackContainerId;
    if (finalContainerId && ref) {
      portal = document.createElement("div");
      portal.className = "bottomfloat-container";
      const container = document.getElementById(finalContainerId);
      if (container) {
        container.appendChild(portal);
        portal.appendChild(ref);
      }
    }
  });

  onDestroy(() => {
    const finalContainerId = containerId || fallbackContainerId;
    if (portal && finalContainerId) {
      const container = document.getElementById(finalContainerId);
      if (container && container.contains(portal)) {
        container.removeChild(portal);
      }
    }
  });

  function resolveIfAppMenuHidden() {
    return !document.getElementById("app-menu");
  }
</script>

<div id={fallbackContainerId} />
<div bind:this={ref}>
  <div
    class={cn(
      "bottomfloat absolute bottom-0 flex inset-x-0 mx-auto",
      zIndex && zIndex,
      margin && margin,
      !margin && {
        "mb-8": $view.isPortrait && isAppMenuHidden,
        "mb-[10.5rem]": $view.isPortrait && $player.isMiniOn,
        "mb-24": $view.isPortrait && !isAppMenuHidden,
        "mb-4": !$view.isPortrait
      },
      classList
    )}
  >
    <slot />
  </div>
</div>
