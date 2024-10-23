<script>
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import YoutubeVideoPreview from "../node/content/web/YoutubeVideoPreview.svelte";
</script>

<div class="flex w-full h-full justify-center items-center mo:p-4 p-8">
  <div class="flex flex-col gap-4 h-full max-h-full overflow-auto w-full">
    <span> Thanks for taking your time to try Memotron alpha. 🎉 🚀 </span>
    <span class="text-fgs3 text-b2">
      We're working on improving the product and making it more useful for you.
      Please report any feedback using chat feature from settings.
    </span>

    <div class="flex gap-4">
      <Button
        label="Read the guide"
        icon="ph:book-open-text"
        type={ButtonVariant.PRIMARY}
        on:click={() => appStore.openLink($appStore.appData?.urls?.guides)}
      />
      <Button
        label="Join us on Discord"
        icon="ph:discord-logo-light"
        on:click={() => appStore.openLink($appStore.appData?.urls?.discord)}
      />
    </div>
    {#if $appStore?.appData?.urls?.onboardingVideo}
      <div class="mt-8">
        <YoutubeVideoPreview
          node={{ url: $appStore?.appData?.urls?.onboardingVideo }}
        />
      </div>
    {/if}
  </div>
</div>
