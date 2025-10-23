<script lang="ts">
  import account from "@21n/stores/account.store";
  import { resolveDiscountLabel } from "@21n/components/subscription/userPlan.utils";
  export let isPreventDiscounting = false;
</script>

{#if $account.plan?.discount && !isPreventDiscounting}
  <div class="text-left rounded-md px-2 text-b2 text-ags1">
    🎉 {resolveDiscountLabel($account.plan)}
  </div>
{/if}
