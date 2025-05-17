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
  import modalEvent from "../../modal/modal.store";
  import { Action } from "$lib/client/types/action.enum";
  import {
    determineIfPlanIsActive,
    resolveLicenseString,
    resolvePlanLabel
  } from "$lib/client/components/subscription/userPlan.utils";
  import { userPreferences } from "../userPreferences.store";
  import { PlanType } from "../../subscription/userPlan.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  export let context: "page" | "modal" = "page";
  export let parentBackgroundIndex: number = 1;
  let isActivePlan = false;
  function determineLicense() {
    if (!$account.plan) return "Unknown";
    isActivePlan = determineIfPlanIsActive($account.plan);
    if ($account.plan?.plan === PlanType.TRIAL) {
      if (!isActivePlan) {
        return "Trial expired - Please upgrade";
      }
      return resolveLicenseString($account.userInfo);
    } else {
      return resolvePlanLabel($account.plan);
    }
  }
</script>

<div
  class={cn("h-40 min-h-[10rem] cw:min-h-[12rem]", bg(parentBackgroundIndex), {
    "mx-4 rounded-lg": context === "page",
    "w-full": context !== "page"
  })}
>
  {#if $account.dataMode === UserDataMode.CLOUD}
    <button
      class="flex flex-col justify-between items-center w-full h-full"
      on:click
    >
      <div class="flex w-full justify-end text-b4 text-fgs3 px-3 pt-2">
        {$account.userInfo?.joinDate
          ? "Joined " + formatDate(new Date($account.userInfo?.joinDate))
          : ""}
      </div>
      <div class="flex justify-between w-full px-3">
        <div class="flex gap-2">
          <ProfilePicture />
          <div class="flex flex-col justify-center items-start userdata">
            <div class="text-h5 text-left">
              {isValidString($userPreferences.name) ||
                isValidString($account.userInfo?.nickName) ||
                "App user"}
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
          class={cn(
            "flex items-center gap-1 text-b3 text-bgs1 px-3 py-1 rounded-tl-md",
            {
              "bg-ags1": isActivePlan,
              "bg-ars1": !isActivePlan,
              "rounded-br-md": context === "page"
            }
          )}
        >
          {#if !isActivePlan}
            <Icon icon="ph:clock-light" class="text-bgs1" size={Size.sm} />
          {/if}
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
          You are using offline mode.
          <div>Please create account to enable cloud sync.</div>
        {:else}
          No Account found.
          <div>Please login/signup to enable cloud sync.</div>
        {/if}
      </div>
      <div class="flex gap-4">
        <Button
          label={$account.dataMode === UserDataMode.LOCAL
            ? "Create account"
            : "Go to signup/signin"}
          parentBgIndex={3}
          size={Size.sm}
          on:click={() => {
            account.signOut({ isPreventDapIdClear: true });
            modalEvent.hide(Action.SETTINGS);
          }}
        />
      </div>
    </div>
  {/if}
</div>
