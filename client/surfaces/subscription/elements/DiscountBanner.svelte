<script lang="ts">
  import account from "@nucleum/client/runtime/account/account.store";
  import { resolveDiscountLabel } from "@nucleum/surfaces/subscription/userPlan.utils";
  let {
    isPreventDiscounting = false
  }: {
    isPreventDiscounting?: boolean;
  } = $props();
</script>

{#if $account.plan?.discount && !isPreventDiscounting}
  <div class="text-left rounded-md px-2 text-b2 text-ags1">
    🎉 {resolveDiscountLabel($account.plan)}
  </div>
{/if}
