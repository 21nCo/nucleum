<script lang="ts">
  import AppMenuSwitcher from "$lib/client/layout/leftPanel/appMenuSwitcher/AppMenuSwitcher.svelte";
  import { LayoutContext } from "$lib/client/types/layout.type";
  import { Size } from "$lib/client/types/size.enum";
  import LeftBottomBar from "./LeftBottomBar.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import LeftNavCommandAction from "./LeftNavCommandAction.svelte";
  import LeftNavOfflineStatus from "./LeftNavOfflineStatus.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import account from "$lib/client/stores/account.store";
  import { PlanType } from "$lib/client/components/subscription/userPlan.type";
  import { resolveTrialDaysLeft } from "$lib/client/components/subscription/userPlan.utils";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  export let isRounded = false;
  $: trialDaysLeft =
    $account.plan?.plan === PlanType.TRIAL
      ? resolveTrialDaysLeft($account.plan)
      : undefined;
</script>

<button
  class={cn(
    "leftnav flex justify-center items-center h-full w-[5.5rem] min-w-[5.5rem]",
    {
      "ml-2": isRounded,
      "border--r border-r-brs2": !isRounded
    }
  )}
>
  <div
    class={cn(
      "flex flex-col pt-4 gap-8 items-center justify-between overflow-auto w-full bg-bgs2",
      {
        "rounded-lg border-none": isRounded,
        "border-r border-brs2": !isRounded
      }
    )}
    style={isRounded ? "height: calc(100% - 1rem);" : "height:100%"}
  >
    <div class="w-full flex flex-col gap-8 overflow-auto">
      <div class="w-full flex justify-center">
        <Button
          icon="ph:magnifying-glass-light"
          parentBgIndex={2}
          size={Size.lg}
          on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
        />
      </div>
      {#if trialDaysLeft && trialDaysLeft < 15}
        <button
          class="flex flex-col gap-1 justify-center items-center bg-aps2 border border-aps1 rounded-md p-1.5 mx-1.5"
          on:click={() =>
            appStore.runAction(Action.SETTINGS, {
              searchParams: {
                [AppSearchParam.SETTING]: Action.USER_BILLING
              }
            })}
        >
          <span class="text-b2"> Trial </span>
          <span class="text-b4">
            {trialDaysLeft} days left
          </span>
        </button>
      {/if}
      <div class="flex flex-col gap-8 items-center w-full p-2 overflow-auto">
        <AppMenuSwitcher
          parentBackgroundIndex={1}
          layoutContext={LayoutContext.THIN_WITH_LABEL}
        />
      </div>
    </div>
    <div class="w-full flex flex-col gap-2 items-center">
      <LeftNavOfflineStatus isInThinMode={true} />
      <LeftNavCommandAction isInThinMode={true} size={Size.lg} />
      <LeftBottomBar isInThinMode={true} {isRounded} size={Size.lg} />
    </div>
  </div>
</button>
