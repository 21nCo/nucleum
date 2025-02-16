<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import account from "$lib/client/stores/account.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import { Action } from "$lib/client/types/action.enum";
  import { onMount } from "svelte";

  let nonce: string | null;
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
      toasts.error("Payment failed");
    }
  }
</script>

<EmptyStatusView isLoadingState={true} loadingText="Confirming payment..." />
