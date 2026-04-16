<script lang="ts">
  let {
    variant = "accent-background",
  }: {
    variant?: "accent-background" | "bg-background" | "accent";
  } = $props();

  let cssRoot: HTMLDivElement | undefined = undefined;
  const circleFill = $derived(
    variant === "accent"
      ? "fill-aps1"
      : variant === "accent-background"
        ? "fill-abg"
        : "fill-fgs1"
  );
  const squareBorder = $derived(
    variant === "accent-background" ? "border-abg" : "border-fg1"
  );

  $effect(() => {
    if (!cssRoot?.parentElement) return;
    const calculatedWidth =
      cssRoot.parentElement.offsetHeight - cssRoot.offsetHeight - 14;
    const width = calculatedWidth < 18 ? 18 : calculatedWidth;
    cssRoot.style.setProperty("--width", `${width}px`);
    cssRoot.style.setProperty("--squareML", `${0 - width / 3}px`);
    cssRoot.style.setProperty("--circleMT", `${0 - width / 9}px`);
  });
</script>

<div id="inlineLoadingAnim" bind:this={cssRoot}>
  <svg
    class="square {squareBorder}"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
  ></svg>
  <svg
    class="circle"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 20 20"
  >
    <circle class={circleFill} cx="10" cy="10" r="10" />
  </svg>
</div>

<style>
  #inlineLoadingAnim {
    --width: var(--width);
    --height: var(--width);
    --squareML: var(--squareML);
    --circleMT: var(--circleMT);
  }
  div {
    position: relative;
    width: calc(var(--width) * 2);
    height: calc(var(--height) / 1.5);
  }

  .circle {
    position: absolute;
    width: calc(var(--width) / 4.5);
    height: calc(var(--height) / 4.5);
    margin-top: var(--circleMT);
    top: 50%;
  }
  .square {
    position: absolute;
    width: calc(var(--width) / 1.5);
    height: calc(var(--height) / 1.5);
    left: 50%;
    z-index: 999;
    margin-left: var(--squareML);
    border: calc((var(--width) / 1.5) * (1 / 24)) solid;
  }

  @keyframes translate {
    0% {
      opacity: 0.05;
    }

    25% {
      opacity: 0.5;
    }

    40% {
      opacity: 1;
    }

    75% {
      opacity: 0.5;
    }

    100% {
      opacity: 0;
      transform: translateX(calc(var(--width) * 1.3));
    }
  }

  @keyframes scale {
    0% {
      transform: scale(1, 1);
    }

    10% {
      transform: scale(0.9, 0.9);
    }

    40% {
      transform: scale(1, 1);
    }

    100% {
      transform: scale(1, 1);
    }
  }

  .circle {
    animation: translate 1s ease infinite;
  }

  .square {
    animation: scale 1s ease 0.25s infinite;
  }
</style>
