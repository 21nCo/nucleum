<script>
  import CopyableText from "$lib/tidy/elements/text/CopyableText.svelte";
  import { appStore, userPreferences } from "$lib/tidy/stores/app.store";
  import account from "$lib/tidy/stores/account.store";
  import { bgClass } from "$lib/tidy/utils/theme.utils";
</script>

<div class="w-full h-full flex justify-center">
  <div
    class="flex flex-col gap-4 bg-bgs2 rounded-md p-6 w-[27rem] h-40 {bgClass(
      $userPreferences.theme
    )}"
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
  </div>
</div>
