<!-- FILEPATH: /Users/ar/dev/devving/Tidigit/pointron/src/lib/tidy/layout/paint/LoadingView.svelte -->

<script lang="ts">
  import SubAtomLogo from "$lib/tidy/branding/SubAtomLogo.svelte";
  import PageLoadingAnimation from "$lib/tidy/elements/feedback/animations/PageLoadingAnimation.svelte";
  import { appStore } from "$lib/tidy/stores/app.store";
  import appearance from "$lib/tidy/stores/appearance.store";
  import { EmbedContext } from "$lib/tidy/types/appStore.type";
  export let message: string | undefined = undefined;
</script>

<div
  class="w-full h-full intialRenderAnimation flex items-center justify-center"
>
  <div class="flex items-center justify-center">
    {#if $appStore.embedContext === EmbedContext.SHEET}
      <div
        class="text-fgs3 text-b3 flex flex-col gap-2 justify-center items-center"
      >
        <PageLoadingAnimation variant="panel-refresh" />
        Loading...
      </div>
    {:else}
      <div class="flex flex-col items-center">
        <SubAtomLogo isDark={$appearance?.colorScheme?.isDark} />
        {#if message}
          <div class="font-medium px-4 text-center text-fgs2 text-b4">
            {message}
          </div>
        {/if}
      </div>
    {/if}
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
