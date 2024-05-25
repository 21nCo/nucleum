<!-- FILEPATH: /Users/ar/dev/devving/Tidigit/pointron/src/lib/tidy/layout/paint/LoadingView.svelte -->

<script lang="ts">
  import SubAtomLogo from "$lib/client/branding/SubAtomLogo.svelte";
  import PageLoadingAnimation from "$lib/client/elements/feedback/animations/PageLoadingAnimation.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import appearance from "$lib/client/stores/appearance.store";
  import { EmbedContext } from "$lib/client/types/appStore.type";
  export let message: string | undefined = undefined;
</script>

<div
  class="w-full h-full bg-bgs1 flex items-center justify-center fixed z-[200]"
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
