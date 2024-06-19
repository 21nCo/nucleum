<script>
  import CopyableText from "$lib/client/elements/text/CopyableText.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import account from "$lib/client/stores/account.store";
</script>

<div class="w-full h-full flex justify-center">
  <div class="flex flex-col gap-4 bg-bgs2 rounded-md p-6 w-[27rem] h-40">
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
  </div>
</div>
