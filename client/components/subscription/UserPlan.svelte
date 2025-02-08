<script lang="ts">
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import type { IPlan, ICurrentPlan } from "./userPlan.type";
  import { BillingPeriod, PlanType } from "./userPlan.type";
  import PlanHeader from "./elements/PlanHeader.svelte";
  import PlanCard from "./elements/PlanCard.svelte";

  let selectedPeriod: BillingPeriod = BillingPeriod.YEARLY;
  let showAllPlans = false;
  export let currentPlan: ICurrentPlan | null = null;

  const billingPeriods = [
    { value: BillingPeriod.MONTHLY, label: "Monthly" },
    { value: BillingPeriod.YEARLY, label: "Yearly", badge: "-20%" },
    { value: BillingPeriod.LIFETIME, label: "Lifetime" }
  ];

  const plans: IPlan[] = [
    {
      name: "Memotron Sync",
      type: PlanType.CLOUD_SYNC,
      description: "Real-time sync across all devices for Memotron",
      price: {
        [BillingPeriod.MONTHLY]: "$7",
        [BillingPeriod.YEARLY]: "$60",
        [BillingPeriod.LIFETIME]: "$250"
      },
      features: [
        "Unlimited cloud sync",
        "End-to-end encryption",
        "20 GB of media storage (add-on for more)",
        "Email and community support"
      ]
    },
    {
      name: "Nucleus",
      type: PlanType.NUCLEUS,
      description: "Everything productivity, single plan",
      price: {
        [BillingPeriod.MONTHLY]: "$15",
        [BillingPeriod.YEARLY]: "$144",
        [BillingPeriod.LIFETIME]: "$450"
      },
      features: [
        "Unlimited cloud sync for Memotron, Pointron - [more soon](https://21n.org)",
        "End-to-end encryption",
        "100 GB of media storage (add-on for more)",
        "Access to Nucleus - the everything productivity app",
        "Early access to new products, features",
        "Priority chat support",
        "Support independent organization - [21n.org](https://21n.org)"
      ],
      isPopular: true
    }
  ];
</script>

<div class="flex flex-col gap-3 dp:gap-6 h-full w-full overflow-auto">
  <PlanHeader
    {currentPlan}
    bind:showAllPlans
    on:showAllPlans={() => {
      selectedPeriod = currentPlan?.billingPeriod || BillingPeriod.YEARLY;
    }}
  />

  {#if !currentPlan || showAllPlans}
    <div class="flex justify-center w-full">
      <PanelSwitcher
        items={billingPeriods}
        bind:value={selectedPeriod}
        style={PanelSwitcherStyle.TRAIN}
        size={Size.sm}
      />
    </div>
  {/if}

  <div class="flex-1 px-4 pb-3 dp:pb-12 w-full">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto h-full">
      {#if currentPlan && !showAllPlans}
        <PlanCard {plans} {currentPlan} isCurrentPage={true} />
      {:else}
        {#each plans as plan}
          <PlanCard {plans} {plan} {currentPlan} period={selectedPeriod} />
        {/each}
      {/if}
    </div>
  </div>
</div>
