<!-- FILEPATH: /Users/ar/dev/devving/Tidigit/pointron/src/lib/tidy/layout/paint/LoadingView.svelte -->

<script lang="ts">
  import SubAtomLogo from "$lib/client/branding/SubAtomLogo.svelte";
  import PageLoadingAnimation from "$lib/client/elements/feedback/animations/PageLoadingAnimation.svelte";
  import context from "$lib/client/stores/context.store";
  import ProgressBar from "$lib/client/elements/ProgressBar.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { fade } from "svelte/transition";
  import { appStore } from "$lib/client/stores/app.store";
  import { Product } from "$lib/client/types/product.type";
  import NucleusAnimation from "$lib/client/branding/NucleusAnimation.svelte";
  export let message: string | undefined = undefined;
  export let subMessage: string | undefined = undefined;
  export let duration: number | undefined = undefined;
  export let percentage: number | undefined = undefined;
</script>

<div
  class="w-screen h-screen bg-bgs1 flex items-center justify-center fixed z-[200]"
>
  <div class="flex items-center justify-center">
    {#if $context.isSheet}
      <div
        class="text-fgs3 text-b3 flex flex-col gap-2 justify-center items-center"
      >
        <PageLoadingAnimation variant="panel-refresh" />
        Loading...
      </div>
    {:else}
      <div class="relative flex flex-col gap-4 items-center">
        {#if $appStore.product === Product.NUCLEUS}
          <NucleusAnimation />
        {:else}
          <SubAtomLogo />
        {/if}
        {#if duration !== undefined || message || subMessage}
          <div
            class="absolute top-full w-fit flex flex-col gap-3 items-center whitespace-nowrap pt-4"
            in:fade={{ duration: 300 }}
          >
            {#if duration !== undefined || percentage !== undefined}
              <div class="w-60">
                <ProgressBar {duration} size={Size.sm} {percentage} />
              </div>
            {/if}
            {#if message}
              <div class="font-medium px-4 text-center text-fgs2 text-b2">
                {message}
              </div>
            {/if}
            {#if subMessage}
              <div class="px-4 text-center text-fgs3 text-b3">
                {subMessage}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
