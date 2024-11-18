<script lang="ts">
  import { onMount } from "svelte";
  import { player } from "../components/modal/modal.store";
  import view from "../stores/view.store";
  import { cn } from "../utils/ui.utils";
  export let isAppMenuHidden: boolean = false;
  export let margin: string = "mb-8";
  export let zIndex: string = "z-20";
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
    "bottomfloat absolute bottom-0 flex inset-x-0",
    zIndex && zIndex,
    margin && margin,
    !margin && {
      "mb-8": $view.isPortrait && isAppMenuHidden,
      "mb-[10.5rem]": $view.isPortrait && $player.isMiniOn,
      "mb-24": $view.isPortrait,
      "mb-4": !$view.isPortrait
    },
    classList
  )}
>
  <slot />
</div>
