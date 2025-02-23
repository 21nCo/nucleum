<script lang="ts">
  import account from "$lib/client/stores/account.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import modalEvent from "../modal/modal.store";
  import { Action } from "$lib/client/types/action.enum";
  import { resolveNextRenewalDate, SUBSCRIPTION_PLANS } from "./userPlan.utils";
  import { formatDate } from "$lib/client/utils/time.utils";
  import PlanFeatureList from "./elements/PlanFeatureList.svelte";
  import { toasts } from "$lib/client/stores/notification.store";

  let isCancelInProgress = false;
  $: isFullRefundable = resolveIfEligibleForFullRefund(
    $account.plan?.paymentDate
  );
  $: currentPlanFeatures = $account.plan
    ? SUBSCRIPTION_PLANS.find((p) => p.type === $account.plan?.plan)?.features
    : [];
  async function proceed() {
    if (isCancelInProgress) return;
    isCancelInProgress = true;
    const response = await account.modifySubscription({
      type: "cancel"
    });
    isCancelInProgress = false;
    if (response && response.status === "success") {
      hide();
      toasts.success("Plan cancelled successfully");
    } else {
      toasts.error("Failed to cancel plan. Please try again later.");
    }
  }

  function resolveIfEligibleForFullRefund(paymentDate: Date | undefined) {
    if (!paymentDate) return false;
    const daysUsed = Math.ceil(
      (new Date().getTime() - new Date(paymentDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return daysUsed <= 30;
  }

  function hide() {
    modalEvent.hide(Action.USER_PLAN_CANCELATION);
  }
</script>

<div class="flex flex-col justify-between h-full w-full gap-4 p-4">
  <div class="flex flex-col items-center gap-6">
    <div class="text-h3 text-fgs2">
      Are you sure you want to cancel your plan?
    </div>
    <div class="flex flex-col gap-2">
      <div>You will no longer have access to the following features:</div>
      <PlanFeatureList features={currentPlanFeatures} />
    </div>
  </div>
  <div class="flex flex-col items-center gap-4">
    <div class="text-fgs3 text-b3 text-center">
      {#if isFullRefundable}
        You will receive a full refund and your plan will be cancelled
        immediately.
      {:else if $account.plan}
        {@const nextPaymentDate = resolveNextRenewalDate($account.plan)}
        {#if nextPaymentDate}
          Your plan will expire on {formatDate(nextPaymentDate)}.
        {/if}
      {/if}
    </div>
    <div class="flex gap-2 w-full justify-center">
      <Button label="Go back" on:click={hide} />
      <Button
        label={isCancelInProgress ? "Cancelling..." : "Proceed to cancel"}
        isDisabled={isCancelInProgress}
        type={ButtonVariant.DANGER}
        style={ButtonStyle.OUTLINED}
        on:click={proceed}
      />
    </div>
  </div>
</div>
