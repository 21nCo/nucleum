<script lang="ts">
  import { appStore } from "@21n/stores/app.store";
  import { debouncer } from "@21n/utils/utils";
  import { onMount, createEventDispatcher } from "svelte";
  export let value: string;
  const dispatch = createEventDispatcher();

  let canvas;
  let ctx;
  let isDragging = false;
  export let selectedColor = { r: 255, g: 0, b: 0, a: 1 };

  onMount(() => {
    ctx = canvas.getContext("2d");
    drawColorSpectrum();
  });

  function drawColorSpectrum() {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "rgb(255, 0, 0)");
    gradient.addColorStop(1 / 6, "rgb(255, 255, 0)");
    gradient.addColorStop(2 / 6, "rgb(0, 255, 0)");
    gradient.addColorStop(3 / 6, "rgb(0, 255, 255)");
    gradient.addColorStop(4 / 6, "rgb(0, 0, 255)");
    gradient.addColorStop(5 / 6, "rgb(255, 0, 255)");
    gradient.addColorStop(1, "rgb(255, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const whiteGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    whiteGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    whiteGradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
    whiteGradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");

    ctx.fillStyle = whiteGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function handleMouseDown(event) {
    isDragging = true;
    updateColor(event);
  }

  function handleMouseMove(event) {
    if (isDragging) {
      updateColor(event);
    }
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function updateColor(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const imageData = ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data;
    selectedColor = { r, g, b, a: 1 };
    value = `#${selectedColor.r.toString(16).padStart(2, "0")}${selectedColor.g.toString(16).padStart(2, "0")}${selectedColor.b.toString(16).padStart(2, "0")}`;
    dispatch("change", {
      rgb: selectedColor,
      hex: value
    });
    debouncedChangePropagation();
  }

  const debouncedChangePropagation = debouncer(() => {
    dispatch("debouncedChange", {
      rgb: selectedColor,
      hex: value
    });
  }, 1000);
</script>

<div class="flex flex-col items-center space-y-6 p-4">
  <div class="relative">
    <canvas
      bind:this={canvas}
      width="400"
      height="250"
      class="cursor-crosshair rounded-lg shadow-inner"
      on:mousedown={handleMouseDown}
      on:mousemove={handleMouseMove}
      on:mouseup={handleMouseUp}
      on:mouseleave={handleMouseUp}
    ></canvas>
    <div
      class="absolute inset-0 rounded-lg border border-brs3 shadow-sm pointer-events-none"
    ></div>
  </div>
  {#if $appStore.isDebugMode}
    <div class="text-center">
      <p class="font-semibold text-lg mb-2">Selected Color: {value}</p>
      <div class="flex items-center justify-center space-x-4">
        <div
          class="w-16 h-16 rounded-full shadow-md border-2 border-white"
          style="background-color: rgb({selectedColor.r}, {selectedColor.g}, {selectedColor.b});"
        ></div>
        <div class="text-left">
          <p>R: {selectedColor.r}</p>
          <p>G: {selectedColor.g}</p>
          <p>B: {selectedColor.b}</p>
        </div>
      </div>
    </div>
  {/if}
</div>
