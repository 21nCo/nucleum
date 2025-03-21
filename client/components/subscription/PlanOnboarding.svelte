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
  import {
    resolveNextRenewalDate,
    resolvePlanLabel,
    SUBSCRIPTION_PLANS
  } from "./userPlan.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { formatDate } from "$lib/client/utils/time.utils";
  import { renderMdAsHtml } from "../markdown/markdown.utils";
  import PlanIcon from "./elements/PlanIcon.svelte";
  import modalEvent from "../modal/modal.store";

  let currentPlanFeatures: Array<{ icon: string; label: string }> = [];
  $: renewalDate = $account.plan?.plan
    ? resolveNextRenewalDate($account.plan)
    : undefined;

  $: {
    if ($account.plan?.plan) {
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

<div class="w-full my-16 px-8 text-center flex flex-col gap-4 items-center">
  <div class="text-[4rem] mb-4">
    <!-- 🎉 -->
    <PlanIcon type={$account.plan?.plan} />
  </div>

  <h1 class="text-3xl font-semibold text-fgs1 mb-8">
    Welcome to {resolvePlanLabel($account.plan)} 🎉
  </h1>

  <div class="bg-bgs2 p-8 rounded-xl mb-8 w-4/5 text-left">
    {#if $account.plan?.cycle !== BillingCycle.LIFETIME}
      <div class="flex items-center gap-2 mb-4">
        <Icon icon="ph:check-circle" class="text-ags1" />
        <p class="text-h3 text-fgs2">Your subscription is now active.</p>
      </div>
    {/if}

    {#if renewalDate}
      <p class="text-sm text-fgs3 mb-8">
        Next payment: {formatDate(renewalDate)}
      </p>
    {/if}

    <div class="text-left">
      <h2 class="text-lg text-fgs1 mb-4">What's included:</h2>
      <ul class="space-y-3">
        {#each currentPlanFeatures as feature}
          <li class="flex items-center gap-2 text-fgs2">
            <Icon icon={feature.icon} size={Size.md} class="text-fgs1" />
            <span>
              {@html renderMdAsHtml(feature.label)}
            </span>
          </li>
        {/each}
      </ul>
    </div>
    <div class="mt-12">
      <Button
        type={ButtonVariant.PRIMARY}
        icon="ph:rocket-light"
        label="Get started"
        on:click={() => {
          modalEvent.hide(Action.PLAN_ONBOARDING);
          appStore.gotoPath("/");
        }}
      />
    </div>
  </div>
</div>
