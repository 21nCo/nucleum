<script lang="ts">
  import { onMount } from "svelte";
  import { player } from "../components/modal/modal.store";
  import view from "../stores/view.store";
  import { cn } from "../utils/ui.utils";
  export let isAppMenuHidden: boolean = false;
  export let marginBottom: string = "mb-8";
  let classList: string = "";
  export { classList as class };
  onMount(() => {
    if (!classList.includes("justify")) {
      classList += " justify-center";
    }
  });
</script>

<div
  class={cn(
    "absolute bottom-0 flex w-full z-20 pointer-events-none",
    marginBottom && marginBottom,
    !marginBottom && {
      "mb-8": $view.isPortrait && isAppMenuHidden,
      "mb-[10.5rem]": $view.isPortrait && $player.isMiniOn,
      "mb-24": $view.isPortrait,
      "mb-4": !$view.isPortrait
    },
    classList
  )}
>
  <div class="pointer-events-auto">
    <slot />
  </div>
</div>
