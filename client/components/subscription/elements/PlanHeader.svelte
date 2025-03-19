<script lang="ts">
  import account from "$lib/client/stores/account.store";
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import { resolveDiscountLabel } from "../userPlan.utils";
</script>

<div class="flex flex-col items-center px-4 cw:mt-12">
  <div class="flex flex-col items-center gap-3 py-3 dp:pt-6">
    <h2 class="cw:text-h3 text-xl font-semibold text-fgs1">Choose Your Plan</h2>
    {#if $account.plan?.discount}
      <div
        class={cn("text-center rounded-md px-2 py-1 text-b2", {
          "text-ags1": $view.isConstrainedWidth,
          "bg-ags1 text-cbg": !$view.isConstrainedWidth
        })}
      >
        🎉 {resolveDiscountLabel($account.plan)}
      </div>
    {:else}
      <p class="text-sm text-center text-fgs2">
        Select a plan that works best for you
      </p>
    {/if}
  </div>
</div>
