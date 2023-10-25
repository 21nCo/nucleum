<script>
  import CopyableLink from "$lib/tidy/elements/text/CopyableLink.svelte";
  import {
    account,
    appStore,
    userPreferences,
  } from "$lib/tidy/stores/app.store";

  import { bg } from "$lib/tidy/utils/utils";
</script>

<div class="w-full h-full flex justify-center">
  <div
    class="flex flex-col gap-4 bg-bgs2 rounded-md p-6 w-[27rem] h-40 {bg(
      $userPreferences.theme
    )}"
  >
    <div>
      Refer your friends to Pointron to help them focus on their work and
      studies.
    </div>
    <div>
      <CopyableLink
        parentBackgroundIndex={2}
        link={($appStore.appData?.urls?.landing ?? "") +
          "?referral=" +
          ($account.userId ? $account.userId : "appuser")}
      />
    </div>
  </div>
</div>
