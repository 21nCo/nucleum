<script lang="ts">
  import Button from "@21n/ui/elements/button/Button.svelte";
  import account from "@nucleum/client/runtime/account/account.store";
  import { accountSession } from "@nucleum/surfaces/account/account-session";
  import {
    LicenseType,
    UserDataMode
  } from "@nucleum/client/runtime/account/account.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import { frameEmailFromParts } from "@nucleum/surfaces/account/profile/email-presentation";
  import { parseAndFormatDate } from "@21n/shared-utils/datetime/date-formatting";
  import { bg, cn } from "@21n/ui/environment/presentation";
  import ProfilePicture from "@nucleum/surfaces/account/profile/ProfilePicture.svelte";
  import modalEvent from "@nucleum/shell/overlays/modal.store";
  import { Action } from "@nucleum/client/config/action.enum";
  import {
    resolveLicenseString,
    resolvePlanLabel
  } from "@nucleum/surfaces/subscription/userPlan.utils";
  import { determineIfPlanIsActive } from "@nucleum/client/runtime/account/plan.utils";
  import { userPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";
  import { PlanType } from "@nucleum/schema/account/subscription";
  import Icon from "@21n/ui/elements/Icon.svelte";
  let {
    context = "page",
    parentBackgroundIndex = 1,
    onclick = undefined
  }: {
    context?: "page" | "modal";
    parentBackgroundIndex?: number;
    onclick?: ((event: MouseEvent) => void) | undefined;
  } = $props();
  const isActivePlan = $derived(
    $account.plan ? determineIfPlanIsActive($account.plan) : false
  );
  const isSignedIn = $derived(
    $account.dataMode === UserDataMode.CLOUD ||
      Boolean($account.token) ||
      Boolean($account.userInfo?.id)
  );
  function determineLicense() {
    if (!$account.plan) return "Unknown";
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
  {#if isSignedIn}
    <button
      class="flex flex-col justify-between items-center w-full h-full"
      {onclick}
    >
      <div class="flex w-full justify-end text-b4 text-fgs3 px-3 pt-2">
        {$account.userInfo?.joinDate
          ? "Joined " +
            parseAndFormatDate(new Date($account.userInfo?.joinDate))
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
                : $account.userInfo?.email || "NA"}
            </div>
          </div>
        </div>
        <Button icon="chevron-right" />
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
            <Icon icon="clock" class="text-bgs1" size={Size.sm} />
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
          onclick={() => {
            accountSession.signOut({ isPreventDapIdClear: true });
            modalEvent.hide(Action.SETTINGS);
          }}
        />
      </div>
    </div>
  {/if}
</div>
