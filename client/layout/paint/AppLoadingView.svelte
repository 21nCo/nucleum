<!-- FILEPATH: /Users/ar/dev/devving/Tidigit/pointron/src/lib/tidy/layout/paint/LoadingView.svelte -->

<script lang="ts">
  import SubAtomLogo from "$lib/client/branding/SubAtomLogo.svelte";
  import PageLoadingAnimation from "$lib/client/elements/feedback/animations/PageLoadingAnimation.svelte";
  import context from "$lib/client/stores/context.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { onMount } from "svelte";
  export let message: string | undefined = undefined;
  export let subMessage: string | undefined = undefined;

  onMount(() => {
    window.addEventListener(GlobalEvent.APP_LOADING_STATUS, handleStatusEvent);
    return () => {
      window.removeEventListener(
        GlobalEvent.APP_LOADING_STATUS,
        handleStatusEvent
      );
    };
  });

  function handleStatusEvent(event: any) {
    if (event.detail.message) {
      message = event.detail.message;
    }
    if (event.detail.subMessage) {
      subMessage = event.detail.subMessage;
    }
  }
</script>

<div
  class="w-full h-full bg-bgs1 flex items-center justify-center fixed z-[200]"
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
      <div class="flex flex-col gap-2 items-center">
        <SubAtomLogo />
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
</div>
