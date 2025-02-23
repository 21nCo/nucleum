<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import account from "$lib/client/stores/account.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import { onMount } from "svelte";

  let nonce: string | null;
  let error: string | null = null;
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    nonce = urlParams.get("nonce");
    if (nonce?.includes("?")) {
      nonce = nonce.split("?")[0];
    }
    checkPaymentStatus();
  });

  async function checkPaymentStatus() {
    if (!nonce) return;
    const response = await account.verifyPayment(nonce);
    if (response?.status === "success") {
      appStore.runAction(Action.PLAN_ONBOARDING);
    } else {
      //TODO - error cases
      error = "Payment failed";
    }
  }
</script>

{#if error}
  <EmptyStatusView
    mainText={error}
    subText="Please try again after sometime. You will receive a refund if an amount is deducted from your account."
  />
{:else}
  <EmptyStatusView isLoadingState={true} loadingText="Confirming payment..." />
{/if}
