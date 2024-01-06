<script>
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import {
    account,
    userPreferences,
    windowObject
  } from "$lib/tidy/stores/app.store";
  import { LicenseType } from "$lib/tidy/types/account.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { frameEmailFromParts } from "$lib/tidy/utils/text.utils";
  import { bgClass } from "$lib/tidy/utils/theme.utils";
  import { formatDate } from "$lib/tidy/utils/utils";
  import ProfilePicture from "./ProfilePicture.svelte";
  function determineLicense() {
    if ($account.userInfo?.licenseType) {
      switch ($account.userInfo?.licenseType) {
        case LicenseType.EA_LIFETIME:
          return "Early Adopter - lifetime license";
        case LicenseType.EA_EXTENDED:
          return "Early Adopter - 2 years extended trial";
        case LicenseType.FREE:
          return "Free plan";
      }
    } else if ($account.userInfo?.joinDate) {
      const joinDate = new Date($account.userInfo?.joinDate);
      const joinDateIsBeforeJan012024 = joinDate < new Date(2024, 1, 1);
      if (joinDateIsBeforeJan012024) {
        return "Early Adopter - lifetime license";
      } else {
        return "Early Adopter - 1 year extended trial";
      }
    }
  }
</script>

<div
  class="rounded-lg mx-4 h-40 min-h-[10rem] {bgClass(
    $userPreferences.theme,
    1
  )}"
>
  {#if $account.isLoggedIn}
    <button
      class="flex flex-col justify-between items-center w-full h-full"
      on:click={() => {
        windowObject.gotoPath("/cp/account");
      }}
    >
      <div class="flex w-full justify-end text-b5 text-fgs3 px-3 pt-2">
        {$account.userInfo?.joinDate
          ? "Joined " + formatDate(new Date($account.userInfo?.joinDate))
          : ""}
      </div>
      <div class="flex justify-between w-full px-3">
        <div class="flex gap-2">
          <ProfilePicture />
          <div class="flex flex-col justify-center items-start">
            <div class="text-h5">
              {$account.userInfo?.nickName || "App user"}
            </div>
            <div class="text-b2 text-fgs3">
              {$account.userInfo?.emailParts
                ? frameEmailFromParts($account.userInfo.emailParts)
                : "NA"}
            </div>
          </div>
        </div>
        <Button icon="chevright" />
      </div>
      <div class="flex w-full justify-end">
        <div
          class="text-b3 bg-ags1 text-bgs1 px-3 py-1 rounded-br-md rounded-tl-md"
        >
          {determineLicense()}
        </div>
      </div>
    </button>
  {:else}
    <div
      class="w-full h-full flex flex-col justify-center gap-10 p-2 text-fgs3 items-center"
    >
      <div class="text-b3 text-center">
        No Account found.
        <div>Please login/signup to enable cloud sync.</div>
      </div>
      <div class="flex gap-4">
        <Button
          label="Go to signup/signin"
          parentBackgroundIndex={2}
          size={Size.sm}
          on:click={() => windowObject.gotoPath("/cp/account")}
        />
      </div>
    </div>
  {/if}
</div>
