<script lang="ts">
  import { onMount } from "svelte";

  export let variant: "accent" | "subtle" | "primary" = "primary";
  export let size: number = 35;
  export let shape: "circle" | "triangle" | "hexagon" = "circle";

  let cssRoot: HTMLElement | null;

  $: threadColor =
    variant === "accent"
      ? "rgba(var(--colors-aps1), 0.5)"
      : variant === "subtle"
        ? "rgba(var(--colors-fgs3), 0.4)"
        : "rgba(var(--colors-fgs1), 0.45)";

  $: bgColor =
    variant === "accent"
      ? "rgba(var(--colors-aps2), 0.05)"
      : variant === "subtle"
        ? "rgba(var(--colors-bgs3), 0.5)"
        : "rgba(var(--colors-bgs2), 0.5)";

  $: clipPath =
    shape === "circle"
      ? "circle(50% at 50% 50%)"
      : shape === "triangle"
        ? "polygon(50% 0%, 0% 100%, 100% 100%)"
        : "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

  onMount(() => {
    cssRoot = document.querySelector("#threadsLoadingAnim");
    if (cssRoot) {
      cssRoot.style.setProperty("--thread-size", `${size}px`);
      cssRoot.style.setProperty("--thread-color", threadColor);
      cssRoot.style.setProperty("--thread-bg", bgColor);
      cssRoot.style.setProperty("--clip-path", clipPath);
    }
  });

  $: if (cssRoot) {
    cssRoot.style.setProperty("--thread-color", threadColor);
    cssRoot.style.setProperty("--thread-bg", bgColor);
    cssRoot.style.setProperty("--clip-path", clipPath);
  }
</script>

<div id="threadsLoadingAnim" class="threads-container">
  <div class="section section-horizontal"></div>
  <div class="section section-diagonal-1"></div>
  <div class="section section-diagonal-2"></div>
</div>

<style>
  .threads-container {
    --thread-size: 40px;
    --thread-color: rgba(var(--colors-fgs2), 0.6);
    --clip-path: circle(50% at 50% 50%);

    position: relative;
    width: var(--thread-size);
    height: var(--thread-size);
    overflow: hidden;
    background: transparent;
    clip-path: var(--clip-path);
  }

  .section {
    position: absolute;
    width: 100%;
    height: 33.33%;
  }

  .section-horizontal {
    top: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 1.5px,
      var(--thread-color) 1.5px,
      var(--thread-color) 2px
    );
    animation: wave-1 2s ease-in-out infinite;
  }

  .section-diagonal-1 {
    top: 33.33%;
    background: repeating-linear-gradient(
      45deg,
      transparent 0px,
      transparent 1.5px,
      var(--thread-color) 1.5px,
      var(--thread-color) 2px
    );
    background-size: 2.83px 2.83px;
    animation: wave-2 2s ease-in-out 0.4s infinite;
  }

  .section-diagonal-2 {
    top: 66.66%;
    background: repeating-linear-gradient(
      -45deg,
      transparent 0px,
      transparent 1.5px,
      var(--thread-color) 1.5px,
      var(--thread-color) 2px
    );
    background-size: 2.83px 2.83px;
    animation: wave-3 2s ease-in-out 0.8s infinite;
  }

  @keyframes wave-1 {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes wave-2 {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes wave-3 {
    0%,
    100% {
      opacity: 0.35;
    }
    50% {
      opacity: 1;
    }
  }
</style>
