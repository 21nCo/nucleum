<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import type { ICurrentPlan } from "../userPlan.type";
  import { createEventDispatcher } from "svelte";
  import account from "$lib/client/stores/account.store";
  import { resolveDiscountLabel } from "$lib/client/utils/account.utils";
  const dispatch = createEventDispatcher();

  export let currentPlan: ICurrentPlan | null = null;
  export let showAllPlans = false;
</script>

<div class="flex flex-col items-center">
  {#if currentPlan}
    <div class="flex flex-col items-center gap-4 py-3 dp:pt-6">
      <h2 class="text-xl font-semibold text-fgs1">Your Current Plan</h2>
      <p class="text-sm text-center text-fgs2">
        Review your subscription and available options
      </p>
      <Button
        label={showAllPlans ? "Show Current Plan" : "Compare All Plans"}
        type={ButtonVariant.SECONDARY}
        style={ButtonStyle.OUTLINED}
        size={Size.sm}
        on:click={() => {
          showAllPlans = !showAllPlans;
          dispatch("showAllPlans", showAllPlans);
        }}
      />
    </div>
  {:else}
    <div class="flex flex-col items-center gap-3 py-3 dp:pt-6">
      <h2 class="text-xl font-semibold text-fgs1">Choose Your Plan</h2>
      {#if $account.plan?.discount}
        <div
          class="text-center bg-ags1 rounded-md px-2 py-1 text-b2 text-cbg font-medium"
        >
          🎉 {resolveDiscountLabel($account.plan)}
        </div>
      {:else}
        <p class="text-sm text-center text-fgs2">
          Select a plan that works best for you
        </p>
      {/if}
    </div>
  {/if}
</div>
