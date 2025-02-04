<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import PlanFeatureList from "./PlanFeatureList.svelte";
  import type { ICurrentPlan, IPlan } from "../userPlan.type";
  import { BillingPeriod, PlanType } from "../userPlan.type";
  import Icon from "$lib/client/elements/Icon.svelte";

  export let plans: IPlan[] = [];
  export let currentPlan: ICurrentPlan | null = null;
  export let plan: IPlan =
    plans.find((p) => p.type === currentPlan?.type) || plans[0];
  export let period: BillingPeriod =
    currentPlan?.billingPeriod || BillingPeriod.MONTHLY;
  export let isCurrentPage = false;
  let isCurrentPlan = currentPlan?.type === plan.type;

  function isUpgrade(plan: IPlan) {
    if (!currentPlan) return false;
    const currentIndex = plans.findIndex((p) => p.type === currentPlan.type);
    const newIndex = plans.findIndex((p) => p.type === plan.type);
    return newIndex > currentIndex;
  }

  function isDowngrade(plan: IPlan) {
    if (!currentPlan) return false;
    const currentIndex = plans.findIndex((p) => p.type === currentPlan.type);
    const newIndex = plans.findIndex((p) => p.type === plan.type);
    return newIndex < currentIndex;
  }
</script>

<div
  class={cn("flex flex-col flex-1 p-6 rounded-lg border relative", {
    "border-aps1 hover:bg-aps3": plan.isPopular && !currentPlan,
    "border-brs3 hover:bg-bgs2": !plan.isPopular || currentPlan,
    "md:col-span-2 max-w-3xl mx-auto w-full": isCurrentPage
  })}
>
  {#if plan.isPopular && !currentPlan}
    <div class="absolute -top-3 right-4">
      <span class="px-3 py-1 text-sm rounded-full bg-aps1 text-abg"
        >Most Popular</span
      >
    </div>
  {/if}

  {#if isCurrentPlan}
    <div class="absolute -top-3 left-4">
      <span class="px-3 py-1 text-sm rounded-full bg-ags1 text-abg">
        Current Plan • {currentPlan?.billingPeriod.toLowerCase()}
      </span>
    </div>
  {/if}

  <div class="flex flex-col h-full">
    <div class="space-y-6">
      <div>
        {#if plan.type === PlanType.CLOUD_SYNC}
          <Icon icon="ph:arrows-clockwise-light" size={Size.xl} />
        {:else}
          <!-- TODO - nucleus - multi app logo -->
          <Icon icon="ph:sparkle-light" size={Size.xl} />
        {/if}
        <h3 class="text-3xl font-semibold text-fgs1">{plan.name}</h3>
        <p class="mt-2 text-sm text-fgs2">{plan.description}</p>
      </div>

      <div>
        {#if period !== BillingPeriod.YEARLY}
          <div class="flex items-baseline gap-2">
            <span class="text-xl font-bold text-fgs1">
              {plan.price[period]}
            </span>
            <span class="text-sm text-fgs2">
              {period === BillingPeriod.LIFETIME ? "one-time" : "/month"}
            </span>
          </div>
        {:else if period === BillingPeriod.YEARLY}
          <div class="flex items-baseline gap-2">
            <span class="text-xl font-bold text-fgs1">
              {`$${(parseInt(plan.price[BillingPeriod.YEARLY].replace("$", "")) / 12).toFixed(2)}`}
            </span>
            <span class="text-sm text-fgs2">/month</span>
          </div>
          <div class="mt-1 text-b3 text-fgs2">
            Total billable today: {plan.price[BillingPeriod.YEARLY]}
          </div>
        {/if}
      </div>
      <PlanFeatureList
        features={plan.features}
        moreLink={plan.type === PlanType.NUCLEUS
          ? "https://21n.org"
          : undefined}
      />
    </div>

    <div class="mt-auto pt-6 flex justify-center">
      {#if isCurrentPlan && currentPlan?.billingPeriod === period}
        <div class="space-y-2">
          <Button
            label="Cancel Subscription"
            icon="ph:x-light"
            type={ButtonVariant.DANGER}
            size={Size.lg}
          />
          <p class="text-center text-sm text-fgs3">
            Access until end of billing period
          </p>
        </div>
      {:else if isCurrentPlan && currentPlan?.billingPeriod !== period}
        <Button
          label={`Change to ${period.toLowerCase()}`}
          icon="ph:arrow-right-light"
          type={ButtonVariant.PRIMARY}
          style={ButtonStyle.OUTLINED}
          size={Size.lg}
        />
      {:else if isUpgrade(plan)}
        <Button
          icon="ph:arrow-up-light"
          label="Upgrade Plan"
          type={ButtonVariant.PRIMARY}
          size={Size.lg}
        />
      {:else if isDowngrade(plan)}
        <Button
          icon="ph:arrow-down-light"
          label="Downgrade Plan"
          type={ButtonVariant.PRIMARY}
          style={ButtonStyle.OUTLINED}
          size={Size.lg}
        />
      {:else}
        <Button
          icon="ph:arrow-right-light"
          label="Choose Plan"
          type={ButtonVariant.PRIMARY}
          style={plan.isPopular ? ButtonStyle.DEFAULT : ButtonStyle.OUTLINED}
          size={Size.lg}
        />
      {/if}
    </div>
  </div>
</div>
