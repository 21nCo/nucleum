<script lang="ts">
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import type { IPlan, ICurrentPlan, IBillingAddress } from "./userPlan.type";
  import { BillingCycle, PlanType } from "./userPlan.type";
  import PlanHeader from "./elements/PlanHeader.svelte";
  import PlanCard from "./elements/PlanCard.svelte";
  import FullScreenCloseButton from "$lib/client/elements/button/FullScreenCloseButton.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import account from "$lib/client/stores/account.store";
  import { SUBSCRIPTION_PLANS } from "./userPlan.utils";
  import BillingAddressCapture from "./BillingAddressCapture.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { postToParent } from "$lib/client/utils/embed.utils";

  let selectedPeriod: BillingCycle = BillingCycle.YEARLY;
  let showAllPlans = true;
  let isBillingAddressCapture = false;
  let selectedPlan: IPlan | null = null;
  let billingAddress: IBillingAddress | undefined = undefined;
  let isRedirecting = false;
  let isSwitching = false;
  $: currentPlan = $account.plan;

  const billingPeriods = [
    { value: BillingCycle.MONTHLY, label: "Monthly" },
    { value: BillingCycle.YEARLY, label: "Yearly", badge: "-20%" },
    { value: BillingCycle.LIFETIME, label: "Lifetime" }
  ];

  async function onSwitch(plan?: IPlan) {
    console.log("onSwitch", plan);
    testIOSPurchase();
    isBillingAddressCapture = true;
    isSwitching = true;
    selectedPlan = plan || null;
  }

  async function onSwitchProceed() {
    isRedirecting = true;
    const response = await account.modifySubscription({
      type: "switch",
      plan: selectedPlan?.type,
      cycle: selectedPeriod,
      billing: billingAddress,
      product: $appStore.product
    });
    console.log({ at: "onSwitchProceed", response });
    if (response && response.nonce) {
      window.location.href = response.paymentLink;
    }
  }

  async function onCancel() {
    appStore.runAction(Action.USER_PLAN_CANCELATION);
  }

  function onChoose(plan: IPlan) {
    testIOSPurchase();
    isBillingAddressCapture = true;
    selectedPlan = plan;
  }

  function testIOSPurchase() {
    console.log({ at: "testIOSPurchase", context: $context });
    if ($context.isEmbed && $context.os === OperatingSystem.IOS) {
      postToParent({
        purchase: JSON.stringify({
          productId: "io.memotron.plan.nucleus.yearly"
        })
      });
    }
  }

  async function onProceed() {
    if (!selectedPlan || !billingAddress) {
      return;
    }
    if (isSwitching) {
      await onSwitchProceed();
      return;
    }
    isRedirecting = true;
    const response = await account.initiateSubscription({
      plan: selectedPlan?.type,
      cycle: selectedPeriod,
      billing: billingAddress,
      product: $appStore.product
    });
    if (response && response.nonce) {
      window.location.href = response.paymentLink;
    }
  }
</script>

{#if isRedirecting}
  <EmptyStatusView
    isLoadingState={true}
    loadingText="Redirecting to payment..."
  />
{:else if isBillingAddressCapture}
  <BillingAddressCapture bind:billingAddress on:proceed={onProceed} />
{:else}
  <div class="flex flex-col gap-3 dp:gap-6 h-full w-full overflow-auto">
    <PlanHeader
      {currentPlan}
      bind:showAllPlans
      on:showAllPlans={() => {
        selectedPeriod = currentPlan?.cycle || BillingCycle.YEARLY;
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
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto h-full"
      >
        {#if currentPlan && !showAllPlans}
          <PlanCard
            plans={SUBSCRIPTION_PLANS}
            {currentPlan}
            isCurrentPage={true}
            on:switch={() => onSwitch()}
            on:cancel={() => onCancel()}
          />
        {:else}
          {#each SUBSCRIPTION_PLANS as plan}
            <PlanCard
              plans={SUBSCRIPTION_PLANS}
              {plan}
              {currentPlan}
              period={selectedPeriod}
              on:switch={() => onSwitch(plan)}
              on:choose={() => onChoose(plan)}
              on:cancel={() => onCancel()}
            />
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}
<FullScreenCloseButton isFloat={true} path={Action.USER_PLAN} />
