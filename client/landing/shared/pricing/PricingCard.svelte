<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import Button from "@21n/landing/shared/elements/Button.svelte";
  import { Size } from "@21n/types/size.enum";
  import type { PricingPlan, PricingToggleOption } from "@21n/landing/shared/pricing/pricing.types";
  import { landing } from "@21n/landing/shared/store/shared.store";
  let {
    plan,
    unit,
  }: {
    plan: PricingPlan;
    unit: PricingToggleOption;
  } = $props();

</script>

<div class={cn("border border-brs3 rounded-lg p-6 flex flex-col")}>
  <div class="mb-6">
    <SvgIcon icon={plan.icon} size={Size.lg} />
  </div>

  <h3 class="text-h2 font-medium mb-1">{plan.title}</h3>
  <p class="text-fgs3 mb-6 text-sm">{plan.subtitle}</p>

  <div class="mb-6 flex flex-col gap-2">
    <div class="flex items-baseline">
      <span class="text-3xl font-bold">
        ${typeof plan.price === "number" ? plan.price : plan.price[unit]}
      </span>
      {#if plan.id !== "free"}
        <span class="text-fgs3 ml-1 text-sm">
          /
          {#if plan.unit}
            {plan.unit}
          {:else if unit}
            {unit}
          {/if}
        </span>
      {/if}
    </div>

    {#if plan.id !== "free" && unit === "yearly"}
      <span class="text-fgs3 ml-1 text-b3">
        That's <b>
          ${(plan.price[unit] / 12).toFixed(2)}
        </b>
        per month
      </span>
    {/if}
  </div>

  <div class="flex-grow">
    <ul class="space-y-3 mb-6">
      {#each plan.features as feature}
        <li class="flex items-start gap-2">
          <div class="flex pt-1">
            <SvgIcon
              icon={feature.icon ? feature.icon : "check"}
              size={Size.sm}
              isRenderRaw={true}
            />
          </div>
          <span class="text-b2">{feature.text}</span>
        </li>
      {/each}
    </ul>
  </div>

  <div class="mt-auto mx-auto">
    <Button
      type={plan.id === "free" ? "secondary" : "primary"}
      label={plan.ctaText}
      icon="arrowright"
      href={plan.id === "free"
        ? $landing.urls?.downloads?.all
        : $landing.urls?.web}
    />
  </div>
  <span class="flex justify-center text-fgs4 text-b3 mt-3">
    {#if plan.id === "free"}
      Requires Desktop or mobile app
    {:else}
      Includes 14 days free trial.
    {/if}
  </span>
</div>
