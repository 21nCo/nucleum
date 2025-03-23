<script lang="ts">
  import account from "$lib/client/stores/account.store";
  import { resolveDiscountLabel } from "../userPlan.utils";
  export let isPreventDiscounting = false;
</script>

{#if $account.plan?.discount && !isPreventDiscounting}
  <div class="text-left rounded-md px-2 text-b2 text-ags1">
    🎉 {resolveDiscountLabel($account.plan)}
  </div>
{/if}
