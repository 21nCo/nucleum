<script>
  import CopyableText from "$lib/tidy/elements/text/CopyableText.svelte";
  import { appStore } from "$lib/tidy/stores/app.store";
  import account from "$lib/tidy/stores/account.store";
  import BackgroundElement from "$lib/tidy/elements/style/BackgroundElement.svelte";
</script>

<div class="w-full h-full flex justify-center">
  <BackgroundElement
    class="flex flex-col gap-4 bg-bgs2 rounded-md p-6 w-[27rem] h-40"
  >
    <div>
      Refer your friends to Pointron to help them focus on their work and
      studies.
    </div>
    <div>
      <CopyableText
        parentBackgroundIndex={2}
        text={($appStore.appData?.urls?.landing ?? "") +
          "?referral=" +
          ($account.userId ? $account.userId : "appuser")}
      />
    </div>
  </BackgroundElement>
</div>
