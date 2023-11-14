<!-- FILEPATH: /Users/ar/dev/devving/Tidigit/pointron/src/lib/tidy/layout/paint/LoadingView.svelte -->

<script lang="ts">
  export let message: string = "booting up...";
</script>

<div
  class="w-full h-full intialRenderAnimation flex items-center justify-center"
>
  <div class="flex items-center justify-center">
    <div class="line bg-fgs1 w-[2px] h-[2.5rem]" />
    <div class="circle bg-fgs1 w-[2.25rem] h-[2.25rem] rounded-full" />
  </div>
</div>

<style>
  /* .intialRenderAnimation .line {
    width: 5.25rem;
    height: 5.25rem;
    background-color: transparent;
    border-left: 4px solid rgba(var(--colors-fgs1), 1);
    animation: lineAnimation 1s forwards cubic-bezier(0.215, 0.61, 0.355, 1);
    animation-delay: 1s;
    transform: scale(0.95) translate(5.25rem, 0);
    border-radius: 50%;
  }
  .intialRenderAnimation .circle {
    width: 4.25rem;
    height: 4.25rem;
    animation: circleAnimation 1s forwards cubic-bezier(0.215, 0.61, 0.355, 1);
  } */
  /* @keyframes lineAnimation {
    0% {
      border-radius: 50%;
    }
    50% {
    }
    100% {
      border-radius: 0;
    }
  }
  @keyframes circleAnimation {
    0% {
      transform: scale(10);
    }
    70% {
      transform: scale(0.9);
    }
    85% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  } */
</style>
