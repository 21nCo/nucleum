<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { resolveIfActiveFgFg } from "$lib/tidy/utils/theme.utils";
  import { onMount } from "svelte";
  export let variant: "accent-background" | "bg-background" =
    "accent-background";
  let cssRoot: any;
  let divParent: any;
  let div: any;
  let width: any;
  let squareML: any;
  let circleMT: any;
  let ranOnce: boolean = false;
  $: isActiveFgFg = resolveIfActiveFgFg(-1, $userPreferences);
  $: circleFill =
    variant === "accent-background" && isActiveFgFg ? "fill-fgs1" : "fill-bgs1";
  $: squareBorder =
    variant === "accent-background" && isActiveFgFg
      ? "border-fgs1"
      : "border-bgs1";
  onMount(() => {
    cssRoot = document.querySelector("#inlineLoadingAnim");
    div = document.getElementById("inlineLoadingAnim");
    divParent = document.getElementById("inlineLoadingAnim")?.parentElement;
  });
  $: if (divParent && !ranOnce) {
    ranOnce = true;
    width = divParent.offsetHeight - div.offsetHeight - 20;
    squareML = 0 - width / 3;
    circleMT = 0 - width / 9;
    width += "px";
    squareML += "px";
    circleMT += "px";
    cssRoot.style.setProperty("--width", width);
    cssRoot.style.setProperty("--squareML", squareML);
    cssRoot.style.setProperty("--circleMT", circleMT);
    // let rs = getComputedStyle(cssRoot);
    // console.log("--squareML is ",rs.getPropertyValue('--squareML'));
  }
</script>

<div id="inlineLoadingAnim">
  <svg
    class="square {squareBorder}"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
  ></svg>
  <svg class="circle" xmlns="http://www.w3.org/2000/svg" fill="none">
    <circle class={circleFill} />
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
  circle {
    cx: calc(var(--width) / 10);
    cy: calc(var(--width) / 10);
    r: calc(var(--width) / 10);
    z-index: 9999;
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
      transform: translateX(calc(var(--width) * 1.8));
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
