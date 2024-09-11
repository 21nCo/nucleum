<script lang="ts">
  import { paintQRCode } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";

  export let url: string = "https://blanklabs.org";
  export let enableHover: boolean = true;
  export let width: number = 122;

  let canvas: HTMLCanvasElement;
  let isHovering: boolean = false;

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
  on:mouseenter={handleHover}
  on:mouseleave={handleLeave}
  class:scale-[1.4]={isHovering}
  class:scale-[1]={!isHovering}
  class="border-2 transition-transform duration-300 ease-in-out origin-bottom-left"
/>
