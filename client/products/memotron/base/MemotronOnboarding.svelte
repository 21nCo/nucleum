<script>
  import { appStore } from "$lib/client/stores/app.store";
  import YoutubeVideoPreview from "../node/content/web/YoutubeVideoPreview.svelte";
</script>

<div class="flex w-full h-full justify-center items-center">
  <div class="flex flex-col gap-4">
    <span> Thanks for taking your time to try Memotron alpha. 🎉 🚀 </span>
    <span class="text-fgs3 text-b2">
      We're working on improving the product and making it more useful for you.
      Please report any feedback using chat feature from settings.
    </span>
    {#if $appStore?.appData?.urls?.onboardingVideo}
      <div class="mt-8">
        <YoutubeVideoPreview
          node={{ url: $appStore?.appData?.urls?.onboardingVideo }}
        />
      </div>
    {/if}
  </div>
</div>
