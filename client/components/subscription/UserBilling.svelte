<script lang="ts">
  import account from "$lib/client/stores/account.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import {
    resolveNextRenewalDate,
    resolvePlanLabel,
    SUBSCRIPTION_PLANS
  } from "./userPlan.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { formatDate } from "$lib/client/utils/time.utils";
  import PlanFeatureList from "./elements/PlanFeatureList.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import { PlanType } from "./userPlan.type";
  import { PlanStatus } from "$lib/client/types/account.type";
  import RestorePurchaseAction from "./RestorePurchaseAction.svelte";

  let currentPlanFeatures: Array<{ icon: string; label: string }> = [];
  $: renewalDate = $account.plan
    ? resolveNextRenewalDate($account.plan)
    : undefined;

  $: if ($account.plan) {
    const selectedPlan = SUBSCRIPTION_PLANS.find(
      (p) => p.type === $account.plan?.plan
    );
    if (selectedPlan) {
      currentPlanFeatures = selectedPlan.features;
    }
  }
</script>

<div class="flex flex-col gap-4 items-center w-full h-full">
  <div class="flex flex-col gap-8 bg-bgs2 p-8 rounded-md w-full">
    <div class="flex flex-col gap-2">
      <p class="text-h3 text-fgs2">{resolvePlanLabel($account.plan)}</p>
      <p class="text-sm text-fgs3">
        {#if renewalDate && $account.plan?.status === PlanStatus.ACTIVE}
          Next payment due: {formatDate(renewalDate)}
        {:else if renewalDate && $account.plan?.status === PlanStatus.CANCELLED}
          Expires: {formatDate(renewalDate)}
        {/if}
      </p>
    </div>
    {#if $account.plan?.plan === PlanType.TRIAL}
      <div>
        <Button
          icon="ph:sparkle-light"
          label="Upgrade"
          type={ButtonVariant.PRIMARY}
          on:click={() => {
            appStore.runAction(Action.USER_PLAN);
          }}
        />
      </div>
    {:else if $account.plan}
      <div class="text-left">
        <h2 class="text-lg text-fgs1 mb-3">What's included:</h2>
        <PlanFeatureList features={currentPlanFeatures} />
      </div>

      <div class="flex gap-2">
        {#if $account.plan.status === PlanStatus.CANCELLED || $account.plan.status === PlanStatus.REFUNDED}
          <Button
            icon="ph:arrow-counter-clockwise-light"
            label="Reactivate"
            type={ButtonVariant.PRIMARY}
            on:click={() => {
              appStore.runAction(Action.USER_PLAN);
            }}
          />
        {:else}
          <Button
            type={ButtonVariant.DANGER}
            style={ButtonStyle.OUTLINED}
            icon="ph:x-light"
            label="Cancel Subscription"
            on:click={() => {
              appStore.runAction(Action.USER_PLAN_CANCELATION);
            }}
          />
          <!-- {#if $account.plan?.cycle !== BillingCycle.LIFETIME}
            <Button
              icon="ph:arrow-right-light"
              parentBgIndex={2}
              label="Change Plan"
              on:click={() => {
                appStore.runAction(Action.USER_PLAN);
              }}
            />
          {/if} -->
        {/if}
      </div>
    {/if}
    <RestorePurchaseAction />
  </div>
</div>
