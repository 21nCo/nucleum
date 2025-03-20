<script lang="ts">
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import type { IPlan, IBillingAddress } from "./userPlan.type";
  import { BillingCycle } from "./userPlan.type";
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
  let isBillingAddressCapture = false;
  let selectedPlan: IPlan | null = null;
  let billingAddress: IBillingAddress | undefined = undefined;
  let isRedirecting = false;
  let isSwitching = false;
  $: currentPlan = $account.plan;
  $: isAppleContext =
    $context.isEmbed &&
    ($context.os === OperatingSystem.IOS ||
      $context.os === OperatingSystem.MACOS);

  const billingPeriods = [
    { value: BillingCycle.MONTHLY, label: "Monthly" },
    { value: BillingCycle.YEARLY, label: "Yearly", badge: "-20%" },
    { value: BillingCycle.LIFETIME, label: "Lifetime" }
  ];

  async function onSwitch(plan?: IPlan) {
    selectedPlan = plan || null;
    if (isAppleContext) {
      completePurchaseOnIOS();
      return;
    }
    isBillingAddressCapture = true;
    isSwitching = true;
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
    selectedPlan = plan;
    if (isAppleContext) {
      completePurchaseOnIOS();
      return;
    }
    isBillingAddressCapture = true;
  }

  function completePurchaseOnIOS() {
    const productId = formProductId();
    postToParent({
      purchase: JSON.stringify({
        productId
      })
    });

    function formProductId() {
      return `app.${$appStore.product}.${selectedPlan?.type}.${selectedPeriod}`;
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
  <div class="flex flex-col gap-6 h-full w-full overflow-auto">
    <PlanHeader />

    <div class="flex justify-center w-full cw:mb-6">
      <PanelSwitcher
        items={billingPeriods}
        bind:value={selectedPeriod}
        style={PanelSwitcherStyle.TRAIN}
        size={Size.sm}
      />
    </div>

    <div class="flex-1 px-4 pb-3 dp:pb-12 w-full">
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto h-full"
      >
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
      </div>
    </div>
  </div>
{/if}
<FullScreenCloseButton isFloat={true} path={Action.USER_PLAN} />
