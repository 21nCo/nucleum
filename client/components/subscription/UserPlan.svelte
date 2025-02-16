<script lang="ts">
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import type { IPlan, ICurrentPlan } from "./userPlan.type";
  import { BillingCycle, PlanType } from "./userPlan.type";
  import PlanHeader from "./elements/PlanHeader.svelte";
  import PlanCard from "./elements/PlanCard.svelte";
  import FullScreenCloseButton from "$lib/client/elements/button/FullScreenCloseButton.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import account from "$lib/client/stores/account.store";
  import { SUBSCRIPTION_PLANS } from "./userPlan.utils";

  let selectedPeriod: BillingCycle = BillingCycle.YEARLY;
  let showAllPlans = false;
  export let currentPlan: ICurrentPlan | null = null;

  const billingPeriods = [
    { value: BillingCycle.MONTHLY, label: "Monthly" },
    { value: BillingCycle.YEARLY, label: "Yearly", badge: "-20%" },
    { value: BillingCycle.LIFETIME, label: "Lifetime" }
  ];

  function onChange(plan?: IPlan) {
    console.log("onChange", plan);
  }

  function onUpgrade(plan?: IPlan) {
    console.log("onUpgrade", plan);
  }

  function onDowngrade(plan?: IPlan) {
    console.log("onDowngrade", plan);
  }

  async function onChoose(plan: IPlan) {
    const response = await account.initiateSubscription({
      plan: plan.type,
      cycle: selectedPeriod
    });
    if (response && response.nonce) {
      window.location.href = response.paymentLink;
    }
  }
</script>

<div class="flex flex-col gap-3 dp:gap-6 h-full w-full overflow-auto">
  <PlanHeader
    {currentPlan}
    bind:showAllPlans
    on:showAllPlans={() => {
      selectedPeriod = currentPlan?.billingCycle || BillingCycle.YEARLY;
    }}
  />

  {#if !currentPlan || showAllPlans}
    <div class="flex justify-center w-full">
      <PanelSwitcher
        items={billingPeriods}
        bind:value={selectedPeriod}
        style={PanelSwitcherStyle.TRAIN}
        size={Size.sm}
      />
    </div>
  {/if}

  <div class="flex-1 px-4 pb-3 dp:pb-12 w-full">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto h-full">
      {#if currentPlan && !showAllPlans}
        <PlanCard
          plans={SUBSCRIPTION_PLANS}
          {currentPlan}
          isCurrentPage={true}
          on:change={() => onChange()}
          on:upgrade={() => onUpgrade()}
          on:downgrade={() => onDowngrade()}
        />
      {:else}
        {#each SUBSCRIPTION_PLANS as plan}
          <PlanCard
            plans={SUBSCRIPTION_PLANS}
            {plan}
            {currentPlan}
            period={selectedPeriod}
            on:change={() => onChange(plan)}
            on:upgrade={() => onUpgrade(plan)}
            on:downgrade={() => onDowngrade(plan)}
            on:choose={() => onChoose(plan)}
          />
        {/each}
      {/if}
    </div>
  </div>
</div>
<FullScreenCloseButton isFloat={true} path={Action.USER_PLAN} />
