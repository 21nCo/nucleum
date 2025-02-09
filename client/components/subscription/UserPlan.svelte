<script lang="ts">
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import type { IPlan, ICurrentPlan } from "./userPlan.type";
  import { BillingCycle, PlanType } from "./userPlan.type";
  import PlanHeader from "./elements/PlanHeader.svelte";
  import PlanCard from "./elements/PlanCard.svelte";
  import FullScreenCloseButton from "$lib/client/elements/button/FullScreenCloseButton.svelte";
  import { Action } from "$lib/client/types/action.enum";

  let selectedPeriod: BillingCycle = BillingCycle.YEARLY;
  let showAllPlans = false;
  export let currentPlan: ICurrentPlan | null = null;

  const billingPeriods = [
    { value: BillingCycle.MONTHLY, label: "Monthly" },
    { value: BillingCycle.YEARLY, label: "Yearly", badge: "-20%" },
    { value: BillingCycle.LIFETIME, label: "Lifetime" }
  ];

  const plans: IPlan[] = [
    {
      name: "Memotron Sync",
      type: PlanType.CLOUD_SYNC,
      description: "Real-time sync across all devices for Memotron",
      price: {
        [BillingCycle.MONTHLY]: "$7",
        [BillingCycle.YEARLY]: "$60",
        [BillingCycle.LIFETIME]: "$250"
      },
      features: [
        {
          icon: "ph:arrows-left-right-light",
          label: "Unlimited cloud sync"
        },
        {
          icon: "ph:lock-light",
          label: "End-to-end encryption"
        },
        {
          icon: "ph:database-light",
          label: "20 GB of media storage (add-on for more)"
        },
        {
          icon: "ph:at-light",
          label: "Email and community support"
        }
      ]
    },
    {
      name: "Nucleus",
      type: PlanType.NUCLEUS,
      description: "Everything productivity, single plan",
      price: {
        [BillingCycle.MONTHLY]: "$15",
        [BillingCycle.YEARLY]: "$144",
        [BillingCycle.LIFETIME]: "$450"
      },
      features: [
        {
          icon: "ph:arrows-left-right-light",
          label:
            "Unlimited cloud sync for Memotron, Pointron - [more soon](https://21n.org)"
        },
        {
          icon: "ph:lock-light",
          label: "End-to-end encryption"
        },
        {
          icon: "ph:database-light",
          label: "100 GB of media storage (add-on for more)"
        },
        {
          icon: "ph:sparkle-light",
          label: "Access to Nucleus - the everything productivity app"
        },
        {
          icon: "ph:clock-light",
          label: "Early access to new products, features"
        },
        {
          icon: "ph:chat-centered-dots-light",
          label: "Priority chat support"
        },
        {
          icon: "ph:hand-heart-light",
          label: "Support independent organization - [21n.org](https://21n.org)"
        }
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
      selectedPeriod = currentPlan?.billingCycle || BillingCycle.YEARLY;
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
<FullScreenCloseButton isFloat={true} path={Action.USER_PLAN} />
