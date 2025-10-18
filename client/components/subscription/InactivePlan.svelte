<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import PlanExpired from "$lib/client/illustrations/PlanExpired.svelte";
  import account from "$lib/client/stores/account.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { parseAndFormatDate } from "$lib/client/utils/time.utils";
  import { properCase } from "$lib/shared/utils/text.utils";
  import modalEvent from "../modal/modal.store";
  import RestorePurchaseAction from "./RestorePurchaseAction.svelte";
  import { PlanType } from "./userPlan.type";

  $: trialExpiry =
    $account.plan?.plan === PlanType.TRIAL && $account.plan?.trialPlan?.expiry
      ? new Date($account.plan.trialPlan.expiry)
      : null;
  $: isTrialExpired = trialExpiry ? new Date() > trialExpiry : false;

  // TODO - use different component for billing issue as actions are not the same
  $: isBillingIssue =
    ($account.plan?.plan === PlanType.CLOUD_SYNC ||
      $account.plan?.plan === PlanType.NUCLEUS) &&
    $account.plan?.billingErrors;

  if (window.location.href.includes("/pay?")) {
    modalEvent.hide(Action.INACTIVE_PLAN);
  }

  const primeFeatures: { icon: string; label: string }[] = [
    {
      icon: "arrows-left-right",
      label: "Unlimited cloud sync across all your devices"
    },
    {
      icon: "sparkle",
      label: "Priority support and early access to new features"
    },
    {
      icon: "heart",
      label: "Support independent team"
    }
  ];
</script>

<div
  class="flex flex-col items-center justify-center gap-6 h-full w-full overflow-auto p-6 text-center"
>
  <div class="flex flex-col gap-4 max-w-lg">
    <div class="flex justify-center">
      <PlanExpired />
    </div>
    <div class="flex flex-col gap-2">
      <h1 class="text-h1 font-bold text-ars1">
        {#if isTrialExpired}
          Your free trial has expired
        {:else if isBillingIssue}
          Your billing information is incorrect
        {:else}
          Your plan is inactive
        {/if}
      </h1>

      <p class="text-fgs2">
        {#if trialExpiry}
          {#if isTrialExpired}
            Your free trial ended on <b>
              {parseAndFormatDate(trialExpiry)}.
            </b>
            Upgrade now to continue using all features.
          {:else}
            Your free trial will expire on {parseAndFormatDate(trialExpiry)}.
            Upgrade now to ensure uninterrupted access.
          {/if}
        {:else if isBillingIssue}
          Please update your billing information to continue using sync
          features.
        {:else}
          Please upgrade your plan to continue using {properCase(
            $appStore.product
          )}'s premium features.
        {/if}
      </p>
    </div>
    {#if !isBillingIssue}
      <div
        class="flex flex-col gap-4 p-6 bg-bgs2 rounded-lg border border-brs3"
      >
        <h2 class="text-lg font-semibold text-fgs1 text-left">Why upgrade?</h2>
        <ul class="flex flex-col gap-3 text-left">
          {#each primeFeatures as feature}
            <li class="flex items-start gap-2">
              <Icon icon={feature.icon} />
              <span class="text-fgs2">{feature.label}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    <div class="flex justify-center gap-8">
      {#if !$view.isConstrainedWidth}
        <RestorePurchaseAction />
      {/if}
      <Button
        label="Chat with us"
        icon="chat-three"
        size={Size.sm}
        style={ButtonStyle.PLAIN}
        on:click={async () => {
          appStore.runAction("chat");
        }}
      />
      <Button
        label="Logout"
        icon="log-out"
        size={Size.sm}
        style={ButtonStyle.PLAIN}
        type={ButtonVariant.DANGER}
        on:click={async () => {
          await account.signOut();
        }}
      />
    </div>
  </div>
</div>
