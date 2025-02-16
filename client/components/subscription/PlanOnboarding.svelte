<script lang="ts">
  import { onMount } from "svelte";
  import account from "$lib/client/stores/account.store";
  import { PlanType, BillingCycle } from "./userPlan.type";
  import { Action } from "$lib/client/types/action.enum";
  import { goto } from "$app/navigation";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { SUBSCRIPTION_PLANS } from "./userPlan.utils";
  import { appStore } from "$lib/client/stores/app.store";

  let planName: string;
  let cycleLabel: string;
  let nextPayment: string | undefined;
  let currentPlanFeatures: Array<{ icon: string; label: string }> = [];

  $: {
    if ($account.plan) {
      planName =
        $account.plan.plan === PlanType.CLOUD_SYNC
          ? "Memotron Sync"
          : $account.plan.plan === PlanType.NUCLEUS
            ? "Nucleus"
            : "Unknown";
      cycleLabel =
        $account.plan.cycle === BillingCycle.LIFETIME
          ? "lifetime"
          : $account.plan.cycle === BillingCycle.YEARLY
            ? "yearly"
            : $account.plan.cycle === BillingCycle.MONTHLY
              ? "monthly"
              : "Unknown";

      if (
        $account.plan.paymentDate &&
        $account.plan.cycle !== BillingCycle.LIFETIME
      ) {
        const nextDate = new Date($account.plan.paymentDate);
        nextDate.setMonth(
          nextDate.getMonth() +
            ($account.plan.cycle === BillingCycle.YEARLY ? 12 : 1)
        );
        nextPayment = nextDate.toLocaleDateString();
      }

      // Get features from the shared plans data
      const selectedPlan = SUBSCRIPTION_PLANS.find(
        (p) => p.type === $account.plan?.plan
      );
      if (selectedPlan) {
        currentPlanFeatures = selectedPlan.features;
      }
    }
  }
</script>

<div
  class="max-w-[600px] mx-auto my-16 px-8 text-center flex flex-col gap-4 items-center"
>
  <div class="text-[4rem] mb-4">
    <Icon icon="ph:check-circle" class="text-ags1" size={Size.xl} />
  </div>

  <h1 class="text-3xl font-semibold text-fgs1 mb-8">
    Welcome to {planName}! 🎉
  </h1>

  <div class="bg-bgs2 p-8 rounded-xl mb-8">
    <p class="text-h3 text-fgs2 mb-4">
      Your {cycleLabel} subscription is now active.
    </p>

    {#if nextPayment}
      <p class="text-sm text-fgs3 mb-8">Next payment due: {nextPayment}</p>
    {/if}

    <div class="text-left">
      <h2 class="text-lg text-fgs1 mb-4">What's included:</h2>
      <ul class="space-y-3">
        {#each currentPlanFeatures as feature}
          <li class="flex items-center gap-2 text-fgs2">
            <Icon icon={feature.icon} size={Size.md} class="text-aps1" />
            <span>{feature.label}</span>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <Button
    type={ButtonVariant.PRIMARY}
    icon="ph:rocket-light"
    label="Start using {planName}"
    on:click={() => {
      appStore.gotoPath("/");
    }}
  />
</div>
