<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import PlanFeatureList from "./PlanFeatureList.svelte";
  import type { ICurrentPlan, IPlan } from "../userPlan.type";
  import { BillingCycle, PlanType } from "../userPlan.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import account from "$lib/client/stores/account.store";
  import { createEventDispatcher } from "svelte";
  import PlanIcon from "./PlanIcon.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  const dispatch = createEventDispatcher();

  export let plans: IPlan[] = [];
  export let currentPlan: ICurrentPlan | null = null;
  export let plan: IPlan =
    plans.find((p) => p.type === currentPlan?.type) || plans[0];
  export let period: BillingCycle =
    currentPlan?.billingCycle || BillingCycle.MONTHLY;
  export let isCurrentPage = false;
  let isCurrentPlan = currentPlan?.type === plan.type;
  let progressState: "initiating" | "upgrading" | "downgrading" | null = null;
  $: actualPrice =
    period === BillingCycle.YEARLY
      ? plan.price[BillingCycle.YEARLY] / 12
      : plan.price[period];
  $: discountedPrice = $account.plan?.discount
    ? resolveDiscountedPrice(actualPrice, $account.plan?.discount)
    : actualPrice;

  $: if (period) {
    resetLoadingState(period);
  }

  function resetLoadingState(period: BillingCycle) {
    progressState = null;
  }

  function resolveDiscountedPrice(price: number, discount: any) {
    if (discount.first && period !== BillingCycle.MONTHLY) {
      return price * (1 - discount.first / 100);
    }
    return null;
  }

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
  class={cn(
    "flex flex-col flex-1 max-h-[48rem] p-6 rounded-lg border relative",
    {
      "border-aps1 hover:bg-aps3/30": plan.isPopular && !currentPlan,
      "border-brs3 hover:bg-bgs2": !plan.isPopular || currentPlan,
      "md:col-span-2 max-w-3xl mx-auto w-full": isCurrentPage
    }
  )}
>
  {#if plan.isPopular && !currentPlan}
    <div class="absolute -top-3 right-4">
      <span class="px-3 py-1 text-sm rounded-full bg-aps1 text-abg"
        >Recommended</span
      >
    </div>
  {/if}

  {#if isCurrentPlan}
    <div class="absolute -top-3 left-4">
      <span class="px-3 py-1 text-sm rounded-full bg-ags1 text-abg">
        Current Plan • {currentPlan?.billingCycle.toLowerCase()}
      </span>
    </div>
  {/if}

  <div class="flex flex-col h-full">
    <div class="space-y-6">
      <div class="flex flex-col gap-4">
        <PlanIcon type={plan.type} />
        <div>
          <h3 class="text-3xl font-semibold text-fgs1">{plan.name}</h3>
          <p class="mt-2 text-b2 text-fgs1">{plan.description}</p>
        </div>
      </div>

      <div>
        <div class="flex items-baseline gap-2">
          {#if discountedPrice}
            <span class="text-xl font-semibold text-ags1">
              ${discountedPrice}
            </span>
          {/if}
          <span
            class={cn("text-xl font-medium", {
              "line-through text-fgs3": discountedPrice,
              "text-fgs1": !discountedPrice
            })}
          >
            {#if period === BillingCycle.YEARLY}
              ${actualPrice.toFixed(2)}
            {:else}
              ${actualPrice}
            {/if}
          </span>
          <span class="text-sm text-fgs2">
            {period === BillingCycle.LIFETIME ? "one-time" : "/month"}
          </span>
        </div>
        <div class="mt-1 text-base text-fgs2">
          {#if period === BillingCycle.YEARLY}
            Pay <b>
              {#if discountedPrice}
                ${discountedPrice * 12}
              {:else}
                ${actualPrice * 12}
              {/if}
            </b>
            today for a full year
          {:else if period === BillingCycle.LIFETIME}
            Get lifetime for the price of just 3 years!
          {/if}
        </div>
      </div>
      <Divider />
      <PlanFeatureList features={plan.features} />
    </div>

    <div class="mt-auto pt-6 flex justify-center">
      {#if isCurrentPlan && currentPlan?.billingCycle === period}
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
      {:else if isCurrentPlan && currentPlan?.billingCycle !== period}
        <Button
          label={`Change to ${period.toLowerCase()}`}
          icon="ph:arrow-right-light"
          type={ButtonVariant.PRIMARY}
          style={ButtonStyle.OUTLINED}
          size={Size.lg}
          on:click={() => {
            dispatch("change");
          }}
        />
      {:else if isUpgrade(plan)}
        <Button
          label="Upgrade Plan"
          isLoading={progressState === "upgrading"}
          type={ButtonVariant.PRIMARY}
          size={Size.lg}
          on:click={() => {
            progressState = "upgrading";
            dispatch("upgrade");
          }}
        />
      {:else if isDowngrade(plan)}
        <Button
          label="Downgrade Plan"
          isLoading={progressState === "downgrading"}
          type={ButtonVariant.PRIMARY}
          style={ButtonStyle.OUTLINED}
          size={Size.lg}
          on:click={() => {
            progressState = "downgrading";
            dispatch("downgrade");
          }}
        />
      {:else}
        <Button
          label="Choose Plan"
          type={ButtonVariant.PRIMARY}
          isLoading={progressState === "initiating"}
          style={plan.isPopular ? ButtonStyle.DEFAULT : ButtonStyle.OUTLINED}
          size={Size.lg}
          on:click={() => {
            progressState = "initiating";
            dispatch("choose");
          }}
        />
      {/if}
    </div>
  </div>
</div>
