<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import Section from "@21n/landing/shared/Section.svelte";
  import Title from "@21n/landing/shared/Title.svelte";
  import PricingCard from "@21n/landing/shared/pricing/PricingCard.svelte";
  import TimeUnitToggle from "@21n/landing/shared/pricing/TimeUnitToggle.svelte";
  import type { PricingPlan, PricingToggleOption } from "@21n/landing/shared/pricing/pricing.types";

  let {
    plans = [],
    title = "Pricing",
    earlyAdopterMessage = "Become an early adopter - Sign up now and get 35% off your first yearly or lifetime plan!",
  }: {
    plans?: PricingPlan[];
    title?: string;
    earlyAdopterMessage?: string;
  } = $props();

  let unit: PricingToggleOption = "yearly";
  let className: string = "";
  export { className as class };
</script>

<Section class={cn("py-10", className)}>
  <div class="flex flex-col items-center w-full gap-8">
    <Title {title} />

    {#if earlyAdopterMessage}
      <div class="w-full flex justify-center">
        <div
          class="w-fit text-center bg-aps3 rounded-full px-4 py-1.5 text-aps1 text-[15px]"
        >
          {earlyAdopterMessage}
        </div>
      </div>
    {/if}
    <TimeUnitToggle bind:unit />
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      {#each plans as plan}
        <PricingCard {plan} {unit} />
      {/each}
    </div>

    <div class="w-full text-center mt-6">
      Educators & students - please <a
        href="mailto:hello@21n.org"
        class="text-aps1 hover:underline">email us</a
      > for a special discount
    </div>
  </div>
</Section>
