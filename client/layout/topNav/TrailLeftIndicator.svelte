<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import account from "$lib/client/stores/account.store";
  import { PlanType } from "$lib/client/components/subscription/userPlan.type";
  import { resolveTrialDaysLeft } from "$lib/client/components/subscription/userPlan.utils";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  export let orientation: Orientation = Orientation.Horizontal;

  $: trialDaysLeft =
    $account.plan?.plan === PlanType.TRIAL
      ? resolveTrialDaysLeft($account.plan)
      : undefined;
</script>

{#if trialDaysLeft !== undefined && trialDaysLeft !== null && trialDaysLeft < 15}
  {@const isTrialExpired = trialDaysLeft <= 0}
  <button
    class={cn(
      "flex gap-1 justify-center items-center border rounded-md  mx-1.5",
      {
        "flex-col p-1.5": orientation === Orientation.Vertical,
        "px-1.5 py-0.5": orientation === Orientation.Horizontal,
        "bg-ars2 border-ars1": isTrialExpired,
        "bg-ass2/10 border-ass1 text-ass1": !isTrialExpired
      }
    )}
    on:click={() =>
      appStore.runAction(Action.SETTINGS, {
        searchParams: {
          [AppSearchParam.SETTING]: Action.USER_BILLING
        }
      })}
  >
    {#if orientation === Orientation.Vertical}
      <span class="text-b2"> Trial </span>
    {/if}
    <span
      class={cn({
        "text-b4": orientation == Orientation.Vertical,
        "text-b3": orientation == Orientation.Horizontal
      })}
    >
      {#if !isTrialExpired}
        {trialDaysLeft}
        {trialDaysLeft === 1 ? "day" : "days"}
        {orientation === Orientation.Horizontal ? "trial" : ""} left
      {:else}
        expired
      {/if}
    </span>
  </button>
{/if}
