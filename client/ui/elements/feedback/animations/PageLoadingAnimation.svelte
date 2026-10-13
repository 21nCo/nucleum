<script lang="ts">
  let {
    variant = "page",
  }: {
    variant?: "panel-refresh" | "page";
  } = $props();

  let cssRoot: SVGElement | undefined = undefined;
  const circleFill = $derived(
    variant === "panel-refresh" ? "fill-fgs3" : "fill-fgs1"
  );
  const svgBorder = $derived(
    variant === "panel-refresh" ? "border-fgs3" : "border-fgs1"
  );
  const width = $derived(variant === "panel-refresh" ? 20 : 25);

  $effect(() => {
    if (!cssRoot) return;
    cssRoot.style.setProperty("--width", `${width}px`);
    cssRoot.style.setProperty("--margin", `${0 - width / 2}px`);
  });
</script>

<svg
  id="pageLoadingAnim"
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  class={svgBorder}
  bind:this={cssRoot}
  viewBox="0 0 100 100"
>
  <circle class={circleFill} cx="50" cy="50" r="25" />
</svg>

<style>
  #pageLoadingAnim {
    --width: var(--width);
    --height: var(--width);
    --margin: var(--margin);
  }
  svg {
    width: var(--width);
    height: var(--height);
    left: 50%;
    top: 50%;
    margin: var(--margin) 0 0 var(--margin);
    border: calc(var(--width) * (1 / 24)) solid;
    border-radius: calc(var(--width) * (1 / 24));
    box-sizing: content-box;
  }
  circle {
    transform-origin: center;
  }
  @keyframes scale {
    0% {
      transform: scale(1);
    }

    50% {
      transform: scale(2);
    }

    100% {
      transform: scale(1);
    }
  }

  @keyframes rotate {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(90deg);
    }
  }

  svg circle {
    animation: scale 1s ease infinite;
  }

  svg {
    animation: rotate 1s ease 0.5s infinite;
  }
</style>
