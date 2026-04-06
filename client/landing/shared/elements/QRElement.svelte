<script lang="ts">
  import { paintQRCode } from "@21n/utils/ui.utils";
  import { onMount } from "svelte";
  import { org } from "@21n/landing/shared/store/shared.store";
  let {
    url = org.website,
    enableHover = true,
    width = 72,
    isHovering = $bindable(false),
  }: {
    url?: string;
    enableHover?: boolean;
    width?: number;
    isHovering?: boolean;
  } = $props();

  let canvas: HTMLCanvasElement;

  function handleHover() {
    if (!enableHover) return;
    isHovering = true;
  }
  function handleLeave() {
    if (!enableHover) return;
    isHovering = false;
  }

  onMount(async () => {
    await paintQRCode(canvas, url, width);
  });
</script>

<canvas
  bind:this={canvas}
  onmouseenter={handleHover}
  onmouseleave={handleLeave}
  class:scale-[1.8]={isHovering}
  class:scale-[1]={!isHovering}
  class="border-2 transition-transform duration-300 ease-in-out origin-bottom-left"
/>
