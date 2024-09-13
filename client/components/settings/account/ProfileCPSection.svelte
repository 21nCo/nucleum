<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import account from "$lib/client/stores/account.store";
  import { LicenseType, UserDataMode } from "$lib/client/types/account.type";
  import { Size } from "$lib/client/types/size.enum";
  import {
    frameEmailFromParts,
    isValidString
  } from "$lib/shared/utils/text.utils";
  import { formatDate } from "$lib/client/utils/time.utils";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import ProfilePicture from "./ProfilePicture.svelte";
  import { Modes } from "../../calendar/birdView/Birdview.type";
  import { signout } from "$lib/client/utils/account.utils";
  import modalEvent from "../../modal/modal.store";
  import { Action } from "$lib/client/types/action.enum";
  export let context: "page" | "modal" = "page";
  export let parentBackgroundIndex: number = 1;
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
  class={cn("h-40 min-h-[10rem]", bg(parentBackgroundIndex), {
    "mx-4 rounded-lg": context === "page",
    "w-full": context !== "page"
  })}
>
  {#if $account.dataMode === UserDataMode.CLOUD}
    <button
      class="flex flex-col justify-between items-center w-full h-full"
      on:click
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
              {isValidString($account.userInfo?.nickName) || "App user"}
            </div>
            <div class="text-b3 text-fgs3">
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
          class="text-b3 bg-ags1 text-bgs1 px-3 py-1 rounded-tl-md {context ===
          'page'
            ? 'rounded-br-md'
            : ''}"
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
        {#if $account.dataMode === UserDataMode.LOCAL}
          Using Offline Mode.
        {:else}
          No Account found.
        {/if}
        <div>Please login/signup to enable cloud sync.</div>
      </div>
      <div class="flex gap-4">
        <Button
          label="Go to signup/signin"
          parentBgIndex={3}
          size={Size.sm}
          on:click={() => {
            signout();
            modalEvent.hide(Action.SETTINGS);
          }}
        />
      </div>
    </div>
  {/if}
</div>
